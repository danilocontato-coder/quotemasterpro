import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { subscription_id } = await req.json();
    console.log(`[setup-client-billing] Processing subscription: ${subscription_id}`);

    // 1. Buscar configurações financeiras
    const { data: settings } = await supabaseClient
      .from('financial_settings')
      .select('*')
      .single();

    const issueNfse = settings?.issue_nfse_with_invoice ?? false;
    console.log(`[setup-client-billing] Settings - Issue NFSe: ${issueNfse}`);

    // 2. Criar assinatura no Asaas (invoca função existente)
    console.log('[setup-client-billing] Creating Asaas subscription...');
    const { data: asaasResult, error: asaasError } = await supabaseClient.functions.invoke(
      'create-asaas-subscription',
      { body: { subscription_id } }
    );

    if (asaasError || !asaasResult?.success) {
      throw new Error(`Falha ao criar assinatura no Asaas: ${asaasError?.message || 'Unknown error'}`);
    }

    const asaasSubscriptionId = asaasResult.asaas_subscription_id;
    console.log(`✅ Assinatura criada no Asaas: ${asaasSubscriptionId}`);

    // 3. Buscar primeira cobrança gerada pelo Asaas
    const { apiKey, baseUrl } = await getAsaasConfig(supabaseClient);
    
    console.log('[setup-client-billing] Fetching first payment from Asaas...');
    const paymentsResponse = await fetch(
      `${baseUrl}/payments?subscription=${asaasSubscriptionId}&limit=1`,
      {
        method: 'GET',
        headers: { 'access_token': apiKey }
      }
    );

    if (!paymentsResponse.ok) {
      const errorText = await paymentsResponse.text();
      throw new Error(`Falha ao buscar cobrança no Asaas: ${errorText}`);
    }

    const paymentsData = await paymentsResponse.json();
    const firstPayment = paymentsData.data?.[0];

    if (!firstPayment) {
      throw new Error('Nenhuma cobrança foi gerada pelo Asaas');
    }

    console.log(`✅ Primeira cobrança encontrada: ${firstPayment.id}`);

    // 4. Buscar dados da subscription
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .select('client_id, plan_id')
      .eq('id', subscription_id)
      .single();

    if (!subscription) {
      throw new Error('Subscription não encontrada');
    }

    // 5. Criar registro de invoice no Supabase
    console.log('[setup-client-billing] Creating invoice record...');
    const { error: invoiceError } = await supabaseClient
      .from('invoices')
      .insert({
        subscription_id,
        client_id: subscription.client_id,
        amount: firstPayment.value,
        due_date: firstPayment.dueDate,
        status: 'pending',
        asaas_charge_id: firstPayment.id,
        boleto_url: firstPayment.bankSlipUrl,
        boleto_barcode: firstPayment.identificationField,
        payment_method: firstPayment.billingType,
        nfse_status: issueNfse ? 'pending' : 'not_issued'
      });

    if (invoiceError) {
      console.error('⚠️ Erro ao criar invoice:', invoiceError);
      throw invoiceError;
    }

    console.log('✅ Invoice criado com sucesso');

    // 6. Emitir NF-e se configurado
    let nfseIssued = false;
    if (issueNfse) {
      console.log('📄 Emitindo NF-e...');
      try {
        const { error: nfseError } = await supabaseClient.functions.invoke(
          'issue-nfse',
          { body: { asaas_charge_id: firstPayment.id } }
        );

        if (nfseError) {
          console.error('⚠️ Erro ao emitir NF-e (não bloqueante):', nfseError);
        } else {
          console.log('✅ NF-e emitida com sucesso');
          nfseIssued = true;
        }
      } catch (nfseErr) {
        console.error('⚠️ Falha ao emitir NF-e (não bloqueante):', nfseErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        asaas_subscription_id: asaasSubscriptionId,
        first_payment_id: firstPayment.id,
        boleto_url: firstPayment.bankSlipUrl,
        nfse_issued: nfseIssued
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[setup-client-billing] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
