import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { quote_id, client_id, supplier_id, amount } = await req.json()

    // Validate required fields (supplier_id pode ser null)
    if (!quote_id || !client_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: quote_id, client_id, amount' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if payment already exists for this quote
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('quote_id', quote_id)
      .single()

    if (existingPayment) {
      return new Response(
        JSON.stringify({ message: 'Payment already exists for this quote', payment_id: existingPayment.id }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate PGT ID
    const pgtNumber = Date.now().toString().slice(-6);
    const paymentId = `PGT${pgtNumber.padStart(6, '0')}`;
    
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        id: paymentId,
        quote_id,
        client_id,
        supplier_id: supplier_id || null, // Permitir supplier_id null
        amount,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating payment:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create payment' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        action: 'PAYMENT_AUTO_CREATED',
        entity_type: 'payments',
        entity_id: paymentId,
        panel_type: 'system',
        details: {
          quote_id,
          amount,
          trigger: 'quote_approved'
        }
      })

    console.log(`Automatic payment created: ${paymentId} for quote: ${quote_id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment_id: paymentId,
        message: 'Automatic payment created successfully'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})