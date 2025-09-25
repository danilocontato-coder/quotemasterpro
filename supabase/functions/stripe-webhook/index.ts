import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.25.0'

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

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-04-10',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response('No signature', { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Webhook signature verification failed', { status: 400 })
    }

    console.log('Processing webhook event:', event.type)

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Buscar informações do pagamento
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select('id, quote_id, client_id, supplier_id')
          .eq('id', paymentIntent.metadata.payment_id)
          .single()

        if (paymentError || !payment) {
          console.error('Payment not found:', paymentError)
          return new Response('Payment not found', { status: 404 })
        }
        
        // Atualizar pagamento para in_escrow
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status: 'in_escrow',
            stripe_payment_intent_id: paymentIntent.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id)

        if (updateError) {
          console.error('Error updating payment:', updateError)
          return new Response('Error updating payment', { status: 500 })
        }

        // Atualizar status da cotação para 'paid'
        const { error: quoteError } = await supabase
          .from('quotes')
          .update({
            status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.quote_id)

        if (quoteError) {
          console.error('Error updating quote status:', quoteError)
        }

        // Notificar fornecedor sobre pagamento confirmado
        if (payment.supplier_id) {
          await supabase.functions.invoke('create-notification', {
            body: {
              user_ids: [payment.supplier_id],
              title: 'Pagamento Confirmado',
              message: `O pagamento da cotação #${payment.quote_id} foi confirmado. Prepare-se para a entrega.`,
              type: 'payment_confirmed',
              priority: 'high',
              metadata: {
                payment_id: payment.id,
                quote_id: payment.quote_id,
                action_url: '/supplier/quotes'
              }
            }
          })
        }

        // Log de auditoria
        await supabase
          .from('audit_logs')
          .insert({
            action: 'PAYMENT_CONFIRMED',
            entity_type: 'payments',
            entity_id: payment.id,
            details: {
              stripe_payment_intent_id: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              status: 'in_escrow',
              quote_id: payment.quote_id
            },
          })

        console.log('Payment moved to escrow and quote status updated:', payment.id)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Atualizar pagamento para failed
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentIntent.metadata.payment_id)

        console.log('Payment failed:', paymentIntent.metadata.payment_id)
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        
        // Buscar pagamento pelo charge
        const { data: payment } = await supabase
          .from('payments')
          .select('*')
          .eq('stripe_payment_intent_id', dispute.payment_intent)
          .single()

        if (payment) {
          // Atualizar para disputed
          await supabase
            .from('payments')
            .update({
              status: 'disputed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', payment.id)

          console.log('Payment disputed:', payment.id)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Webhook error', { status: 500 })
  }
})