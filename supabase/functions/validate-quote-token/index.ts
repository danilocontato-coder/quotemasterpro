import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔵 [validate-quote-token] Function invoked')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔵 [validate-quote-token] Handling OPTIONS request')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔵 [validate-quote-token] Creating Supabase client')
    // Use SERVICE_ROLE_KEY to bypass RLS and validate any token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    console.log('🔵 [validate-quote-token] Request body:', body)
    const { quote_id, token } = body

    if (!token) {
      console.log('❌ [validate-quote-token] Missing token')
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'token is required' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Look up token (with or without quote_id)
    console.log('🔍 [validate-quote-token] Looking up token...')
    let tokenData: any = null
    let tokenError: any = null

    if (quote_id) {
      console.log('🔍 [validate-quote-token] Searching with quote_id:', quote_id)
      const res = await supabaseClient
        .from('quote_tokens')
        .select('*')
        .eq('quote_id', quote_id)
        .eq('full_token', token)
        .maybeSingle()
      tokenData = res.data
      tokenError = res.error
      console.log('🔍 [validate-quote-token] Token search result:', { found: !!tokenData, error: tokenError })
    } else {
      console.log('🔍 [validate-quote-token] Searching without quote_id')
      const res = await supabaseClient
        .from('quote_tokens')
        .select('*')
        .eq('full_token', token)
        .maybeSingle()
      tokenData = res.data
      tokenError = res.error
      console.log('🔍 [validate-quote-token] Token search result:', { found: !!tokenData, error: tokenError })
    }

    if (tokenError || !tokenData) {
      console.error('❌ [validate-quote-token] Token validation failed:', { quote_id, token, tokenError })
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid token' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ [validate-quote-token] Token found:', tokenData.id)
    const resolvedQuoteId = tokenData.quote_id

    // Check if token has expired
    console.log('🔍 [validate-quote-token] Checking expiration:', tokenData.expires_at)
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log('❌ [validate-quote-token] Token has expired')
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Token has expired',
          expired: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch quote details AND supplier data to include in response
    console.log('🔍 [validate-quote-token] Fetching quote:', resolvedQuoteId)
    const { data: quoteData, error: quoteError } = await supabaseClient
      .from('quotes')
      .select('id, title, description, status, deadline, client_name, supplier_id')
      .eq('id', resolvedQuoteId)
      .maybeSingle()

    console.log('🔍 [validate-quote-token] Quote fetch result:', { found: !!quoteData, error: quoteError })

    if (quoteError || !quoteData) {
      console.error('❌ [validate-quote-token] Quote not found:', { resolvedQuoteId, quoteError })
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Quote not found' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch supplier data if quote has a supplier_id
    console.log('🔍 [validate-quote-token] Checking for supplier_id:', quoteData.supplier_id)
    let supplierData = null
    if (quoteData.supplier_id) {
      console.log('🔍 [validate-quote-token] Fetching supplier:', quoteData.supplier_id)
      const { data: supplier, error: supplierError } = await supabaseClient
        .from('suppliers')
        .select('id, name, email, cnpj, phone, city, state')
        .eq('id', quoteData.supplier_id)
        .single()
      
      console.log('🔍 [validate-quote-token] Supplier fetch result:', { found: !!supplier, error: supplierError })
      
      if (!supplierError && supplier) {
        supplierData = supplier
        console.log('✅ [validate-quote-token] Supplier data found:', supplier.name)
      }
    }

    // Update access count
    console.log('🔄 [validate-quote-token] Updating access count')
    const { error: updateError } = await supabaseClient
      .from('quote_tokens')
      .update({ 
        access_count: tokenData.access_count + 1,
        used_at: new Date().toISOString()
      })
      .eq('id', tokenData.id)

    if (updateError) {
      console.error('⚠️ [validate-quote-token] Error updating token access:', updateError)
    }

    console.log('✅ [validate-quote-token] Validation successful, returning data')
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
    console.error('❌ [validate-quote-token] Error:', error)
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: (error as any)?.message || 'Unknown error' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
