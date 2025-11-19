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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔍 Testando conexão com Asaas...')

    // Obter configuração do Asaas
    const { apiKey, baseUrl, environment } = await getAsaasConfig(supabase)

    // Testar conexão fazendo uma chamada simples à API
    const testResponse = await fetch(`${baseUrl}/finance/balance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      }
    })

    if (!testResponse.ok) {
      const error = await testResponse.json()
      console.error('❌ Erro ao conectar com Asaas:', error)
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: error.errors?.[0]?.description || 'Falha ao conectar com Asaas',
          environment,
          message: `Ambiente: ${environment}. Verifique se a chave de API corresponde ao ambiente selecionado.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const balanceData = await testResponse.json()
    console.log('✅ Conexão com Asaas bem-sucedida:', { environment, balance: balanceData.balance })

    return new Response(
      JSON.stringify({ 
        success: true,
        environment,
        balance: balanceData.balance || 0,
        message: `Conexão bem-sucedida com Asaas (${environment})`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('❌ Erro ao testar conexão:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Erro desconhecido'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
