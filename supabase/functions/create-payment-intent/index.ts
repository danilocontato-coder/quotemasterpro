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

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { paymentId } = await req.json()

    // Buscar dados do pagamento
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        quotes!inner(id, title, client_id),
        clients!inner(id, name, email)
      `)
      .eq('id', paymentId)
      .eq('status', 'pending')
      .single()

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Pagamento não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se usuário pode pagar (mesmo cliente)
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (profile?.client_id !== payment.client_id) {
      return new Response(
        JSON.stringify({ error: 'Sem permissão para este pagamento' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar customer no Stripe se não existir
    let customerId = payment.clients.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: payment.clients.email,
        name: payment.clients.name,
        metadata: {
          client_id: payment.client_id,
          supabase_user_id: user.id,
        },
      })
      
      customerId = customer.id
      
      // Salvar customer ID no cliente
      await supabase
        .from('clients')
        .update({ stripe_customer_id: customerId })
        .eq('id', payment.client_id)
    }

    // Criar payment intent no Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(payment.amount * 100), // Centavos
      currency: 'brl',
      customer: customerId,
      description: `Pagamento da cotação ${payment.quote_id}`,
      metadata: {
        payment_id: payment.id,
        quote_id: payment.quote_id,
        client_id: payment.client_id,
        supplier_id: payment.supplier_id,
      },
      // Configurar para escrow (não capturar automaticamente)
      capture_method: 'manual',
    })

    // Atualizar pagamento com stripe_payment_intent_id
    await supabase
      .from('payments')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    // Log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        action: 'PAYMENT_INTENT_CREATED',
        entity_type: 'payments',
        entity_id: paymentId,
        user_id: user.id,
        details: {
          stripe_payment_intent_id: paymentIntent.id,
          amount: payment.amount,
        },
      })

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating payment intent:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})