import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getAsaasConfig } from "../_shared/asaas-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validar usuário e permissões
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrair token e validar usuário
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Erro de autenticação:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se usuário é admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      console.error('❌ Acesso negado: usuário não é admin');
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ Usuário autenticado: ${user.email} (Admin)`);

    const { customerId, status, limit = 100, offset = 0, dateFrom, dateTo } = await req.json();

    console.log(`🔍 Parâmetros da busca:`, { customerId, status, limit, offset, dateFrom, dateTo });

    const asaasConfig = await getAsaasConfig(supabaseClient);

    // Buscar cobranças do Asaas
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    if (customerId) params.append('customer', customerId);
    if (status) params.append('status', status);
    if (dateFrom) params.append('dateCreated[ge]', dateFrom);
    if (dateTo) params.append('dateCreated[le]', dateTo);

    console.log(`📋 Buscando cobranças do Asaas: ${asaasConfig.baseUrl}/payments?${params}`);

    const response = await fetch(`${asaasConfig.baseUrl}/payments?${params}`, {
      method: 'GET',
      headers: {
        'access_token': asaasConfig.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro ao buscar cobranças:', error);
      throw new Error(`Erro Asaas: ${error}`);
    }

    const paymentsData = await response.json();
    console.log(`✅ ${paymentsData.data?.length || 0} cobranças encontradas`);

    // Enriquecer dados com nome do cliente
    const enrichedPayments = await Promise.all(
      (paymentsData.data || []).map(async (payment: any) => {
        let customerName = payment.customer; // fallback para ID do Asaas
        let customerType = 'unknown';

        // 🔍 PASSO 1: Buscar em CLIENTS usando asaas_customer_id
        const { data: client } = await supabaseClient
          .from('clients')
          .select('id, name, company_name')
          .eq('asaas_customer_id', payment.customer)
          .maybeSingle();

        if (client) {
          customerName = client.company_name || client.name || 'Cliente sem nome';
          customerType = 'client';
          console.log(`✅ Cliente encontrado: ${customerName} (ID: ${client.id})`);
        } else {
          // 🔍 PASSO 2: Se não encontrou em clients, tentar em SUPPLIERS
          const { data: supplier } = await supabaseClient
            .from('suppliers')
            .select('id, name')
            .eq('asaas_wallet_id', payment.customer)
            .maybeSingle();

          if (supplier) {
            customerName = supplier.name || 'Fornecedor sem nome';
            customerType = 'supplier';
            console.log(`✅ Fornecedor encontrado: ${customerName} (ID: ${supplier.id})`);
          } else {
            console.warn(`⚠️ Cliente/Fornecedor não encontrado para customer_id: ${payment.customer}`);
            customerName = `ID Asaas: ${payment.customer}`;
            customerType = 'unknown';
          }
        }

        return {
          ...payment,
          customerName,
          customerType,
        };
      })
    );

    return new Response(JSON.stringify({
      ...paymentsData,
      data: enrichedPayments,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
