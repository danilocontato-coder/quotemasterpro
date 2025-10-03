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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { quote_id } = await req.json()

    if (!quote_id) {
      return new Response(
        JSON.stringify({ error: 'quote_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get quote to extract client_id
    const { data: quoteData, error: quoteError } = await supabaseClient
      .from('quotes')
      .select('client_id')
      .eq('id', quote_id)
      .single()

    if (quoteError || !quoteData) {
      console.error('Quote not found:', quoteError)
      return new Response(
        JSON.stringify({ error: 'Quote not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate unique short code
    const generateShortCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      let result = ''
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return result
    }

    // Generate unique token UUID
    const fullToken = crypto.randomUUID()

    // Try to generate unique short code (max 10 attempts)
    let shortCode = ''
    let attempts = 0
    
    while (attempts < 10) {
      shortCode = generateShortCode()
      
      // Check if short code already exists
      const { data: existingToken } = await supabaseClient
        .from('quote_tokens')
        .select('id')
        .eq('short_code', shortCode)
        .single()
      
      if (!existingToken) break
      attempts++
    }

    if (attempts >= 10) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate unique short code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert token into database with client_id
    const { data: tokenData, error: insertError } = await supabaseClient
      .from('quote_tokens')
      .insert({
        quote_id,
        client_id: quoteData.client_id,
        short_code: shortCode,
        full_token: fullToken,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting token:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get base URL from system settings
    let baseUrl = 'https://cotiz.com.br'
    
    try {
      const { data: settingsData } = await supabaseClient
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'base_url')
        .single()
      
      if (settingsData?.setting_value) {
        const settingValue = typeof settingsData.setting_value === 'string' 
          ? settingsData.setting_value.replace(/"/g, '')
          : String(settingsData.setting_value || '').replace(/"/g, '')
        
        if (settingValue) {
          baseUrl = settingValue
        }
      }
    } catch (error) {
      console.log('Could not fetch base URL from settings, using fallback:', baseUrl)
    }
    
    
    const shortPath = `/s/${shortCode}`
    const redirectPath = `/r/${fullToken}`
    const shortUrl = `${baseUrl}${shortPath}`
    const fullUrl = `${baseUrl}${redirectPath}`

    console.log('🔗 [GENERATE-QUOTE-TOKEN] URLs generated:', { baseUrl, shortPath, redirectPath, shortUrl, fullUrl })

    return new Response(
      JSON.stringify({
        success: true,
        token: tokenData,
        short_url: shortUrl,
        full_url: fullUrl,
        short_path: shortPath,
        redirect_path: redirectPath,
        short_code: shortCode,
        full_token: fullToken
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-quote-token:', error)
    return new Response(
      JSON.stringify({ error: (error as any)?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})