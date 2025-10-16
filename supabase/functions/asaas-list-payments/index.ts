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
        // Buscar nome do cliente/fornecedor via asaas_customer_id
        const { data: subscription } = await supabaseClient
          .from('subscriptions')
          .select(`
            client_id,
            supplier_id,
            clients:client_id(name, company_name),
            suppliers:supplier_id(name)
          `)
          .eq('asaas_customer_id', payment.customer)
          .single();

        let customerName = payment.customer; // fallback para ID
        let customerType = 'unknown';

        if (subscription) {
          if (subscription.client_id && subscription.clients) {
            customerName = subscription.clients.company_name || subscription.clients.name;
            customerType = 'client';
          } else if (subscription.supplier_id && subscription.suppliers) {
            customerName = subscription.suppliers.name;
            customerType = 'supplier';
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
