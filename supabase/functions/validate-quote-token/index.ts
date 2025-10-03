import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Use SERVICE_ROLE_KEY to bypass RLS and validate any token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { quote_id, token } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'token is required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Look up token (with or without quote_id)
    let tokenData: any = null
    let tokenError: any = null

    if (quote_id) {
      const res = await supabaseClient
        .from('quote_tokens')
        .select('*')
        .eq('quote_id', quote_id)
        .eq('full_token', token)
        .maybeSingle()
      tokenData = res.data
      tokenError = res.error
    } else {
      const res = await supabaseClient
        .from('quote_tokens')
        .select('*')
        .eq('full_token', token)
        .maybeSingle()
      tokenData = res.data
      tokenError = res.error
    }

    if (tokenError || !tokenData) {
      console.error('Token validation failed:', { quote_id, token }, tokenError)
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid token' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resolvedQuoteId = tokenData.quote_id

    // Check if token has expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Token has expired',
          expired: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch quote details AND supplier data to include in response
    const { data: quoteData, error: quoteError } = await supabaseClient
      .from('quotes')
      .select('id, title, description, status, deadline, client_name, supplier_id')
      .eq('id', resolvedQuoteId)
      .maybeSingle()

    if (quoteError || !quoteData) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Quote not found' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch supplier data if quote has a supplier_id
    let supplierData = null
    if (quoteData.supplier_id) {
      const { data: supplier, error: supplierError } = await supabaseClient
        .from('suppliers')
        .select('id, name, email, cnpj, phone, city, state')
        .eq('id', quoteData.supplier_id)
        .single()
      
      if (!supplierError && supplier) {
        supplierData = supplier
        console.log('✅ Supplier data found for quote:', supplier.name)
      }
    }

    // Update access count
    const { error: updateError } = await supabaseClient
      .from('quote_tokens')
      .update({ 
        access_count: tokenData.access_count + 1,
        used_at: new Date().toISOString()
      })
      .eq('id', tokenData.id)

    if (updateError) {
      console.error('Error updating token access:', updateError)
    }

    return new Response(
      JSON.stringify({
        valid: true,
        token: {
          id: tokenData.id,
          short_code: tokenData.short_code,
          expires_at: tokenData.expires_at,
          access_count: tokenData.access_count + 1
        },
        quote: quoteData,
        supplier: supplierData,
        quote_id: resolvedQuoteId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in validate-quote-token:', error)
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: (error as any)?.message || 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})