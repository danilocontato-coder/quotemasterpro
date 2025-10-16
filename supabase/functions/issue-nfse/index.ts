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
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { asaas_charge_id, invoice_id } = await req.json();

    let chargeId = asaas_charge_id;

    // Se passou invoice_id, buscar asaas_charge_id
    if (!chargeId && invoice_id) {
      const { data: invoice } = await supabaseClient
        .from('invoices')
        .select('asaas_charge_id')
        .eq('id', invoice_id)
        .single();

      if (!invoice?.asaas_charge_id) {
        throw new Error('Invoice not found or not linked to Asaas payment');
      }
      chargeId = invoice.asaas_charge_id;
    }

    if (!chargeId) {
      throw new Error('Missing asaas_charge_id or invoice_id');
    }

    console.log(`Issuing NFS-e for charge: ${chargeId}`);

    // Buscar dados da fatura
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select('*')
      .or(`asaas_charge_id.eq.${chargeId},id.eq.${invoice_id}`)
      .single();

    if (invoiceError || !invoice) {
      console.error('Erro ao buscar invoice:', invoiceError);
      throw new Error('Invoice não encontrada');
    }

    // Buscar dados do cliente
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('address, company_name, email, cnpj')
      .eq('id', invoice.client_id)
      .single();

    if (clientError || !client) {
      throw new Error('Cliente não encontrado');
    }

    // Validar CEP
    const address = typeof client.address === 'string' 
      ? JSON.parse(client.address) 
      : client.address;

    if (!address?.zipCode || address.zipCode.replace(/\D/g, '').length !== 8) {
      throw new Error('CEP do cliente é obrigatório para emissão de NF-e. Atualize o cadastro do cliente.');
    }

    const { apiKey, baseUrl } = await getAsaasConfig(supabaseClient);

    // Buscar configurações de NFS-e
    const { data: settings } = await supabaseClient
      .from('financial_settings')
      .select('nfse_municipal_service_code, nfse_municipal_service_id, nfse_service_description, nfse_default_observations')
      .single();

    // Marcar como processando
    await supabaseClient
      .from('invoices')
      .update({
        nfse_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('asaas_charge_id', chargeId);

    // Criar NFS-e no Asaas
    const nfseResponse = await fetch(`${baseUrl}/invoices`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payment: chargeId,
        serviceDescription: settings?.nfse_service_description || 'Serviços de gestão de cotações e fornecedores',
        observations: settings?.nfse_default_observations || '',
        municipalServiceId: settings?.nfse_municipal_service_id || '01.01',
        municipalServiceCode: settings?.nfse_municipal_service_code || '0101',
        municipalServiceName: 'Análise e desenvolvimento de sistemas'
      })
    });

    if (!nfseResponse.ok) {
      const errorData = await nfseResponse.json();
      const errorMsg = errorData.errors?.[0]?.description || nfseResponse.statusText;
      
      // Marcar como erro
      await supabaseClient
        .from('invoices')
        .update({
          nfse_status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('asaas_charge_id', chargeId);

      throw new Error(`Failed to issue NFS-e: ${errorMsg}`);
    }

    const nfseData = await nfseResponse.json();
    console.log(`NFS-e created: ${nfseData.id}`);

    // Atualizar invoice com dados da NFS-e
    const { error: updateError } = await supabaseClient
      .from('invoices')
      .update({
        nfse_id: nfseData.id,
        nfse_number: nfseData.number,
        nfse_url: nfseData.pdfUrl,
        nfse_status: 'issued',
        nfse_issued_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('asaas_charge_id', chargeId);

    if (updateError) {
      throw updateError;
    }

    // Log de auditoria
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'NFSE_ISSUED',
        entity_type: 'invoices',
        entity_id: chargeId,
        panel_type: 'admin',
        details: {
          nfse_id: nfseData.id,
          nfse_number: nfseData.number,
          nfse_url: nfseData.pdfUrl
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        nfse_id: nfseData.id,
        nfse_number: nfseData.number,
        nfse_url: nfseData.pdfUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in issue-nfse:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
