import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAsaasConfig } from '../_shared/asaas-utils.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { supplierId, walletId } = await req.json()

    if (!walletId) {
      return new Response(
        JSON.stringify({ error: 'walletId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 Validando wallet ${walletId} do fornecedor ${supplierId}`)

    // Obter configuração do Asaas
    const { apiKey, baseUrl } = await getAsaasConfig(supabase)

    // Validar wallet no Asaas
    const validateResponse = await fetch(`${baseUrl}/accounts/${walletId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      }
    })

    const valid = validateResponse.ok

    if (valid) {
      const walletData = await validateResponse.json()
      console.log(`✅ Wallet válida:`, walletData)
      
      return new Response(
        JSON.stringify({ 
          valid: true, 
          wallet: walletData,
          message: 'Wallet validada com sucesso'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } else {
      const error = await validateResponse.json()
      console.warn(`⚠️ Wallet inválida:`, error)
      
      // Log de auditoria
      await supabase.from('audit_logs').insert({
        action: 'WALLET_VALIDATION_FAILED',
        entity_type: 'suppliers',
        entity_id: supplierId,
        user_id: user.id,
        panel_type: 'admin',
        details: {
          wallet_id: walletId,
          asaas_error: error,
          http_status: validateResponse.status
        }
      })
      
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: error.errors?.[0]?.description || 'Wallet inválida',
          message: 'Wallet não encontrada ou inválida no Asaas'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }
  } catch (error: any) {
    console.error('❌ Erro ao validar wallet:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
