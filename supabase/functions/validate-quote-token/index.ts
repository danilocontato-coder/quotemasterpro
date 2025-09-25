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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { quote_id, token } = await req.json()

    if (!quote_id || !token) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'quote_id and token are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Look up token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('quote_tokens')
      .select('*')
      .eq('quote_id', quote_id)
      .eq('full_token', token)
      .single()

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

    // Fetch quote details to include in response
    const { data: quoteData, error: quoteError } = await supabaseClient
      .from('quotes')
      .select('id, title, description, status, deadline, client_name')
      .eq('id', quote_id)
      .single()

    if (quoteError || !quoteData) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Quote not found' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
        quote: quoteData
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