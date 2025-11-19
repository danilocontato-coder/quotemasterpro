import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders } from '../_shared/cors.ts';
import { getAsaasConfig } from '../_shared/asaas-utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { payment_id } = await req.json();

    if (!payment_id) {
      return new Response(JSON.stringify({ error: 'payment_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar pagamento
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*, quotes!inner(id, local_code)')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: 'Pagamento não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Se não tem asaas_payment_id, não há o que sincronizar
    if (!payment.asaas_payment_id) {
      return new Response(JSON.stringify({ 
        error: 'Pagamento não possui asaas_payment_id',
        current_status: payment.status
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar configuração Asaas usando utilitário compartilhado
    const asaasConfig = await getAsaasConfig(supabaseClient);
    const { apiKey: asaasApiKey, baseUrl: asaasUrl } = asaasConfig;

    // Consultar status no Asaas
    const asaasResponse = await fetch(`${asaasUrl}/payments/${payment.asaas_payment_id}`, {
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!asaasResponse.ok) {
      return new Response(JSON.stringify({ 
        error: 'Erro ao consultar Asaas',
        status: asaasResponse.status
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const asaasPayment = await asaasResponse.json();
    
    // Mapear status do Asaas para nosso sistema COM ESCROW
    let newStatus = payment.status;
    let quoteStatus = null;

    if (asaasPayment.status === 'RECEIVED' || asaasPayment.status === 'CONFIRMED') {
      // Se pagamento estava pendente, vai para CUSTÓDIA (não paid diretamente)
      if (payment.status === 'pending') {
        newStatus = 'in_escrow';  // ✅ Custódia até confirmação de entrega
        quoteStatus = 'approved';  // ✅ Cotação aprovada (não paid ainda)
        console.log(`💰 Pagamento ${payment_id} movido para escrow`);
      }
      // Se já estava em custódia, manter em custódia
      else if (payment.status === 'in_escrow') {
        newStatus = 'in_escrow';  // Mantém custódia
        console.log(`💰 Pagamento ${payment_id} mantém status escrow`);
      }
      // Se já estava paid/completed, manter
      else if (payment.status === 'paid' || payment.status === 'completed') {
        newStatus = payment.status;
        console.log(`✅ Pagamento ${payment_id} já finalizado: ${payment.status}`);
      }
    } else if (asaasPayment.status === 'OVERDUE') {
      newStatus = 'overdue';
    } else if (asaasPayment.status === 'PENDING') {
      newStatus = 'pending';
    }

    // Se o status mudou, atualizar
    if (newStatus !== payment.status) {
      await supabaseClient
        .from('payments')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment_id);

      console.log(`✅ Pagamento ${payment_id}: ${payment.status} → ${newStatus}`);

      // Atualizar cotação se necessário
      if (quoteStatus) {
        await supabaseClient
          .from('quotes')
          .update({
            status: quoteStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.quote_id);

        console.log(`📋 Cotação ${payment.quote_id}: status → ${quoteStatus}`);
      }

      // Log de auditoria
      await supabaseClient
        .from('audit_logs')
        .insert({
          action: 'PAYMENT_SYNC',
          entity_type: 'payments',
          entity_id: payment_id,
          panel_type: 'system',
          details: {
            old_status: payment.status,
            new_status: newStatus,
            asaas_payment_id: payment.asaas_payment_id,
            asaas_status: asaasPayment.status,
            synced_at: new Date().toISOString()
          }
        });

      return new Response(JSON.stringify({ 
        success: true,
        old_status: payment.status,
        new_status: newStatus,
        synced: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Status não mudou
    return new Response(JSON.stringify({ 
      success: true,
      status: payment.status,
      synced: false,
      message: 'Status já está atualizado'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error syncing payment status:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});