import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders } from '../_shared/cors.ts';

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

    // Buscar configuração Asaas
    const { data: settings } = await supabaseClient
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'asaas_config')
      .single();

    if (!settings?.setting_value?.api_key) {
      return new Response(JSON.stringify({ error: 'Configuração Asaas não encontrada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const asaasApiKey = settings.setting_value.api_key;
    const asaasEnv = settings.setting_value.environment || 'sandbox';
    const asaasUrl = asaasEnv === 'production' 
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';

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
    
    // Mapear status do Asaas para nosso sistema
    let newStatus = payment.status;
    if (asaasPayment.status === 'RECEIVED' || asaasPayment.status === 'CONFIRMED') {
      newStatus = 'paid';
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

      // Se foi pago, atualizar cotação também
      if (newStatus === 'paid') {
        await supabaseClient
          .from('quotes')
          .update({
            status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.quote_id);
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