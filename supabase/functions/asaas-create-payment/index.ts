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

    const { customerId, value, dueDate, description, billingType = 'BOLETO' } = await req.json();

    if (!customerId || !value || !dueDate) {
      throw new Error('customerId, value e dueDate são obrigatórios');
    }

    const asaasConfig = await getAsaasConfig(supabaseClient);

    const paymentData = {
      customer: customerId,
      billingType,
      value: parseFloat(value),
      dueDate,
      description: description || 'Cobrança gerada manualmente',
    };

    console.log(`💰 Criando nova cobrança no Asaas:`, paymentData);

    const response = await fetch(`${asaasConfig.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'access_token': asaasConfig.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro ao criar cobrança:', error);
      throw new Error(`Erro Asaas: ${error}`);
    }

    const payment = await response.json();
    console.log(`✅ Cobrança criada: ${payment.id} - Boleto: ${payment.bankSlipUrl}`);

    // Buscar cliente/fornecedor associado ao customerId
    const { data: client } = await supabaseClient
      .from('clients')
      .select('id')
      .eq('asaas_customer_id', customerId)
      .single();

    const { data: supplier } = await supabaseClient
      .from('suppliers')
      .select('id')
      .eq('asaas_wallet_id', customerId)
      .single();

    // Criar invoice no banco
    await supabaseClient
      .from('invoices')
      .insert({
        client_id: client?.id || null,
        supplier_id: supplier?.id || null,
        amount: payment.value,
        due_date: payment.dueDate,
        status: 'pending',
        asaas_charge_id: payment.id,
        boleto_url: payment.bankSlipUrl,
        boleto_barcode: payment.identificationField,
      });

    return new Response(JSON.stringify(payment), {
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
