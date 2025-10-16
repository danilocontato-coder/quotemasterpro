import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

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

    // Validar token de webhook para segurança
    const webhookToken = req.headers.get('asaas-access-token');
    const { data: tokenSettings } = await supabaseClient
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'asaas_webhook_token')
      .single();

    if (tokenSettings?.setting_value?.token && webhookToken !== tokenSettings.setting_value.token) {
      console.error('Unauthorized webhook attempt - invalid token');
      
      // Log de segurança
      await supabaseClient
        .from('audit_logs')
        .insert({
          action: 'WEBHOOK_UNAUTHORIZED_ATTEMPT',
          entity_type: 'webhooks',
          entity_id: 'asaas-webhook',
          panel_type: 'system',
          details: {
            ip: req.headers.get('x-forwarded-for') || 'unknown',
            user_agent: req.headers.get('user-agent'),
            timestamp: new Date().toISOString()
          }
        });

      return new Response('Unauthorized', { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const webhook = await req.json();
    console.log('Received Asaas webhook:', webhook.event);

    const event = webhook.event;
    const payment = webhook.payment;

    // Processar eventos de pagamento
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      console.log(`Payment received: ${payment.id}`);

      // Buscar invoice pelo asaas_charge_id
      const { data: invoice, error: invError } = await supabaseClient
        .from('invoices')
        .select('*, subscriptions!subscription_id(id, client_id, supplier_id)')
        .eq('asaas_charge_id', payment.id)
        .single();

      if (invError || !invoice) {
        console.log('Invoice not found for payment:', payment.id);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Atualizar invoice
      await supabaseClient
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      // Atualizar subscription para active
      if (invoice.subscription_id) {
        await supabaseClient
          .from('subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice.subscription_id);

        // Reativar cliente se estava suspenso
        if (invoice.subscriptions.client_id) {
          await supabaseClient
            .from('clients')
            .update({
              active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', invoice.subscriptions.client_id);
        }

        if (invoice.subscriptions.supplier_id) {
          await supabaseClient
            .from('suppliers')
            .update({
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', invoice.subscriptions.supplier_id);
        }
      }

      // Verificar se deve emitir NFS-e automaticamente
      const { data: settings } = await supabaseClient
        .from('financial_settings')
        .select('auto_issue_nfse')
        .single();

      if (settings?.auto_issue_nfse) {
        console.log('Auto-issuing NFS-e for payment:', payment.id);
        await supabaseClient.functions.invoke('issue-nfse', {
          body: { asaas_charge_id: payment.id }
        });
      }

      console.log('Payment processed successfully');
    }

    // Processar eventos de inadimplência
    if (event === 'PAYMENT_OVERDUE') {
      console.log(`Payment overdue: ${payment.id}`);

      const { data: invoice } = await supabaseClient
        .from('invoices')
        .select('*, subscriptions!subscription_id(id, client_id, supplier_id)')
        .eq('asaas_charge_id', payment.id)
        .single();

      if (invoice) {
        // Atualizar status da invoice
        await supabaseClient
          .from('invoices')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice.id);

        // Buscar configurações de suspensão
        const { data: settings } = await supabaseClient
          .from('financial_settings')
          .select('days_before_suspension, auto_suspend')
          .single();

        if (settings?.auto_suspend) {
          const dueDate = new Date(invoice.due_date);
          const daysSinceDue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysSinceDue >= (settings.days_before_suspension || 7)) {
            console.log(`Suspending subscription for overdue payment (${daysSinceDue} days)`);

            if (invoice.subscription_id) {
              // Suspender assinatura
              await supabaseClient
                .from('subscriptions')
                .update({
                  status: 'suspended',
                  updated_at: new Date().toISOString()
                })
                .eq('id', invoice.subscription_id);

              // Desativar cliente/fornecedor
              if (invoice.subscriptions.client_id) {
                await supabaseClient
                  .from('clients')
                  .update({
                    active: false,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', invoice.subscriptions.client_id);
              }

              if (invoice.subscriptions.supplier_id) {
                await supabaseClient
                  .from('suppliers')
                  .update({
                    status: 'suspended',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', invoice.subscriptions.supplier_id);
              }

              // Log de auditoria
              await supabaseClient
                .from('audit_logs')
                .insert({
                  action: 'SUBSCRIPTION_SUSPENDED',
                  entity_type: 'subscriptions',
                  entity_id: invoice.subscription_id,
                  panel_type: 'system',
                  details: {
                    reason: 'payment_overdue',
                    days_overdue: daysSinceDue,
                    invoice_id: invoice.id
                  }
                });
            }
          }
        }
      }
    }

    // Processar eventos de assinatura
    if (event === 'SUBSCRIPTION_UPDATED' || event === 'SUBSCRIPTION_EXPIRED') {
      const subscription = webhook.subscription;
      console.log(`Subscription ${event}: ${subscription.id}`);

      await supabaseClient
        .from('subscriptions')
        .update({
          status: event === 'SUBSCRIPTION_EXPIRED' ? 'expired' : 'active',
          updated_at: new Date().toISOString()
        })
        .eq('asaas_subscription_id', subscription.id);
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in asaas-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
