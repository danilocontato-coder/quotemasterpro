import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const webhook = await req.json()
    console.log('Webhook Asaas recebido:', webhook)

    const { event, payment } = webhook

    if (!payment?.externalReference) {
      console.log('Webhook sem externalReference, ignorando')
      return new Response('OK', { status: 200 })
    }

    const paymentId = payment.externalReference

    // Atualizar status baseado no evento
    switch (event) {
      case 'PAYMENT_RECEIVED':
        // Cliente pagou, fundos entram em escrow
        await supabase
          .from('payments')
          .update({
            status: 'in_escrow',
            transfer_method: payment.billingType.toLowerCase(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentId)

        // Notificar cliente e fornecedor
        const { data: paymentData } = await supabase
          .from('payments')
          .select('client_id, supplier_id, amount, quote_id')
          .eq('id', paymentId)
          .single()

        if (paymentData) {
          // Notificar cliente
          await supabase.rpc('notify_client_users', {
            p_client_id: paymentData.client_id,
            p_title: 'Pagamento Recebido',
            p_message: `Pagamento ${paymentId} confirmado! Fundos em garantia até confirmação de entrega.`,
            p_type: 'payment',
            p_priority: 'normal',
          })

          // Notificar fornecedor
          await supabase.rpc('create_notification', {
            p_user_id: paymentData.supplier_id,
            p_title: 'Pagamento em Garantia',
            p_message: `Cliente pagou R$ ${paymentData.amount}. Realize a entrega para liberar os fundos.`,
            p_type: 'payment',
            p_priority: 'high',
          })
        }

        console.log(`Pagamento ${paymentId} recebido e em escrow`)
        break

      case 'PAYMENT_CONFIRMED':
        // Confirmação adicional (redundante com PAYMENT_RECEIVED)
        console.log(`Pagamento ${paymentId} confirmado`)
        break

      case 'PAYMENT_OVERDUE':
        // Pagamento vencido
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentId)
        console.log(`Pagamento ${paymentId} vencido`)
        break

      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
        // Pagamento cancelado/reembolsado
        await supabase
          .from('payments')
          .update({
            status: 'refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentId)
        console.log(`Pagamento ${paymentId} reembolsado`)
        break

      default:
        console.log(`Evento não tratado: ${event}`)
    }

    // Log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        action: `ASAAS_WEBHOOK_${event}`,
        entity_type: 'payments',
        entity_id: paymentId,
        panel_type: 'system',
        details: {
          event,
          payment_id: payment.id,
          billing_type: payment.billingType,
          value: payment.value,
        },
      })

    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('Error processing Asaas webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
