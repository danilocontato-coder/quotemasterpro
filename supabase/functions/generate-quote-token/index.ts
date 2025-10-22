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

    const { quote_id, supplier_id } = await req.json()
    
    if (!quote_id) {
      return new Response(
        JSON.stringify({ error: 'quote_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate that quote_id is a valid UUID (Opção A: UUID obrigatório)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(quote_id)) {
      console.error('❌ [GENERATE-QUOTE-TOKEN] Invalid quote_id format (must be UUID):', quote_id)
      return new Response(
        JSON.stringify({ 
          error: 'quote_id must be a valid UUID',
          received: quote_id,
          hint: 'Use quote.id (UUID) instead of quote.local_code'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get quote by UUID only (no ambiguity with multi-tenant local_codes)
    const { data: quoteData, error: quoteError } = await supabaseClient
      .from('quotes')
      .select('id, local_code, client_id, deadline')
      .eq('id', quote_id)
      .maybeSingle()

    console.log('📋 [GENERATE-QUOTE-TOKEN] Quote lookup:', {
      quote_id,
      found: !!quoteData,
      client_id: quoteData?.client_id,
      local_code: quoteData?.local_code
    })

    if (quoteError || !quoteData) {
      console.error('Quote not found:', quoteError)
      return new Response(
        JSON.stringify({ error: 'Quote not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use o id interno da quote (UUID) para buscar tokens
    const internalQuoteId = quoteData.id
    
    // Verificar se já existe um token válido para esta cotação + fornecedor
    let query = supabaseClient
      .from('quote_tokens')
      .select('*')
      .eq('quote_id', internalQuoteId)
      .gt('expires_at', new Date().toISOString())

    // Se supplier_id foi fornecido, buscar token específico desse fornecedor
    if (supplier_id) {
      query = query.eq('supplier_id', supplier_id)
      console.log('🔍 [GENERATE-QUOTE-TOKEN] Verificando token existente para fornecedor:', supplier_id)
    } else {
      // Se não tem supplier_id, buscar apenas tokens genéricos (supplier_id = null)
      query = query.is('supplier_id', null)
      console.log('🔍 [GENERATE-QUOTE-TOKEN] Verificando token genérico (sem fornecedor)')
    }

    const { data: existingTokens } = await query
      .order('created_at', { ascending: false })
      .limit(1)
    
    // Se encontrou token existente e válido, reutilizar
    if (existingTokens && existingTokens.length > 0) {
      const existingToken = existingTokens[0]
      console.log('🔗 [GENERATE-QUOTE-TOKEN] ♻️ Reutilizando token existente:', {
        quote_id,
        supplier_id: supplier_id || 'generic',
        short_code: existingToken.short_code
      })
      
      // Buscar base URL
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
          if (settingValue) baseUrl = settingValue
        }
      } catch (error) {
        console.log('Could not fetch base URL, using fallback:', baseUrl)
      }
      
      const shortPath = `/s/${existingToken.short_code}`
      const redirectPath = `/r/${existingToken.full_token}`
      const shortUrl = `${baseUrl}${shortPath}`
      const fullUrl = `${baseUrl}${redirectPath}`
      
      return new Response(
        JSON.stringify({
          success: true,
          token: existingToken,
          short_url: shortUrl,
          full_url: fullUrl,
          short_path: shortPath,
          redirect_path: redirectPath,
          short_code: existingToken.short_code,
          full_token: existingToken.full_token,
          reused: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔗 [GENERATE-QUOTE-TOKEN] 🆕 Criando novo token para quote_id:', quote_id)

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

    // CORREÇÃO CRÍTICA: Sempre usar 7 dias a partir de AGORA (não usar deadline diretamente)
    // Motivo: deadline pode ser apenas uma data (sem hora), resultando em meia-noite daquele dia
    // Isso causava tokens que expiravam imediatamente após criação
    const DEFAULT_TOKEN_VALIDITY_DAYS = 7;
    const expiresAt = new Date(Date.now() + DEFAULT_TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    
    console.log('🔗 [GENERATE-QUOTE-TOKEN] Token expiration:', {
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      validity_days: DEFAULT_TOKEN_VALIDITY_DAYS,
      quote_deadline: quoteData.deadline || 'none'
    })

    // Insert token into database with client_id and supplier_id (usando id interno UUID)
    const { data: tokenData, error: insertError } = await supabaseClient
      .from('quote_tokens')
      .insert({
        quote_id: internalQuoteId,
        client_id: quoteData.client_id,
        supplier_id: supplier_id || null,
        short_code: shortCode,
        full_token: fullToken,
        expires_at: expiresAt
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
        full_token: fullToken,
        reused: false
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