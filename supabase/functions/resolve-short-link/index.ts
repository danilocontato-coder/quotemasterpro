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

    const { short_code } = await req.json()

    if (!short_code) {
      return new Response(
        JSON.stringify({ error: 'Short code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Look up token by short code
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('quote_tokens')
      .select('*')
      .eq('short_code', short_code)
      .single()

    if (tokenError || !tokenData) {
      console.error('Token not found:', short_code, tokenError)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired link' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if token has expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Link has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update access count and used_at timestamp
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

    // Get base URL from system settings
    let baseUrl = req.headers.get('origin') || 'https://bcadcdb0-8f04-4a14-8998-22e01e1b27d7.lovableproject.com'
    
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
    
    const fullUrl = `${baseUrl}/supplier/auth/${tokenData.quote_id}/${tokenData.full_token}`

    return new Response(
      JSON.stringify({
        success: true,
        quote_id: tokenData.quote_id,
        full_token: tokenData.full_token,
        redirect_url: fullUrl,
        expires_at: tokenData.expires_at,
        access_count: tokenData.access_count + 1
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in resolve-short-link:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})