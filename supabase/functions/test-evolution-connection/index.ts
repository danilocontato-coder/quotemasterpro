import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
import { resolveEvolutionConfig, normalizePhone } from "../_shared/evolution.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { clientId, testPhone } = await req.json()
    
    console.log('🔍 [Evolution Test] Starting connection test...')
    console.log('🔍 [Evolution Test] clientId:', clientId)

    // 1. Resolver configuração Evolution
    const config = await resolveEvolutionConfig(supabase, clientId, true)
    
    console.log('🔍 [Evolution Test] Config resolved:')
    console.log('   - apiUrl:', config.apiUrl)
    console.log('   - instance:', config.instance)
    console.log('   - scope:', config.scope)
    console.log('   - sendEndpoint:', config.sendEndpoint)
    console.log('   - token (partial):', config.token?.substring(0, 10) + '...')

    if (!config.apiUrl || !config.token) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Evolution API não configurada. Configure api_url e token nas integrações.',
        config: {
          hasApiUrl: !!config.apiUrl,
          hasToken: !!config.token,
          scope: config.scope
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const results: any = {
      config: {
        apiUrl: config.apiUrl,
        instance: config.instance,
        scope: config.scope,
        hasToken: !!config.token,
        sendEndpoint: config.sendEndpoint
      },
      tests: []
    }

    // 2. Testar endpoints de status/instância
    const statusEndpoints = [
      { name: 'Instance Info', url: `${config.apiUrl}/instance/fetchInstances` },
      { name: 'Connection State', url: `${config.apiUrl}/instance/connectionState/${config.instance}` },
      { name: 'Instance Status', url: `${config.apiUrl}/instance/status/${config.instance}` },
      { name: 'Instance Info v2', url: `${config.apiUrl}/${config.instance}/info` },
    ]

    for (const endpoint of statusEndpoints) {
      try {
        console.log(`🔍 Testing: ${endpoint.name} - ${endpoint.url}`)
        
        const res = await fetch(endpoint.url, {
          method: 'GET',
          headers: {
            'apikey': config.token,
            'Content-Type': 'application/json'
          }
        })

        const text = await res.text()
        let data: any = null
        try { data = JSON.parse(text) } catch { data = text }

        results.tests.push({
          name: endpoint.name,
          url: endpoint.url,
          status: res.status,
          ok: res.ok,
          response: typeof data === 'string' ? data.substring(0, 200) : data
        })

        console.log(`   Status: ${res.status} ${res.ok ? '✅' : '❌'}`)
        if (res.ok) {
          console.log(`   Response: ${JSON.stringify(data).substring(0, 150)}`)
        }
      } catch (e: any) {
        results.tests.push({
          name: endpoint.name,
          url: endpoint.url,
          error: e.message
        })
        console.log(`   Error: ${e.message}`)
      }
    }

    // 3. Testar endpoints de envio de mensagem (sem enviar de verdade)
    const sendEndpoints = [
      { name: 'sendText v2', url: `${config.apiUrl}/message/sendText/${config.instance}`, payload: { number: '5500000000000', text: 'test' } },
      { name: 'sendText v1', url: `${config.apiUrl}/${config.instance}/sendText`, payload: { number: '5500000000000', text: 'test' } },
    ]

    // Apenas testar se o endpoint existe (OPTIONS ou GET para ver se retorna 404)
    for (const endpoint of sendEndpoints) {
      try {
        console.log(`🔍 Probing send endpoint: ${endpoint.url}`)
        
        const res = await fetch(endpoint.url, {
          method: 'OPTIONS',
          headers: {
            'apikey': config.token,
          }
        })

        results.tests.push({
          name: `Probe: ${endpoint.name}`,
          url: endpoint.url,
          status: res.status,
          exists: res.status !== 404
        })

        console.log(`   Probe status: ${res.status} (404 = não existe)`)
      } catch (e: any) {
        results.tests.push({
          name: `Probe: ${endpoint.name}`,
          url: endpoint.url,
          error: e.message
        })
      }
    }

    // 4. Se testPhone fornecido, testar envio real
    if (testPhone) {
      const normalizedPhone = normalizePhone(testPhone)
      console.log(`📱 Testing real send to: ${normalizedPhone}`)

      const testEndpoint = `${config.apiUrl}/message/sendText/${config.instance}`
      const testPayload = { number: normalizedPhone, text: '🧪 Teste de conexão Cotiz - se você recebeu esta mensagem, a integração está funcionando!' }

      try {
        const res = await fetch(testEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.token
          },
          body: JSON.stringify(testPayload)
        })

        const text = await res.text()
        let data: any = null
        try { data = JSON.parse(text) } catch { data = text }

        results.sendTest = {
          endpoint: testEndpoint,
          phone: normalizedPhone,
          status: res.status,
          ok: res.ok,
          response: data
        }

        console.log(`📱 Send test result: ${res.status} ${res.ok ? '✅' : '❌'}`)
        console.log(`📱 Response: ${JSON.stringify(data).substring(0, 300)}`)
      } catch (e: any) {
        results.sendTest = {
          endpoint: testEndpoint,
          phone: normalizedPhone,
          error: e.message
        }
        console.log(`📱 Send test error: ${e.message}`)
      }
    }

    // 5. Determinar status geral
    const workingTests = results.tests.filter((t: any) => t.ok)
    results.summary = {
      totalTests: results.tests.length,
      workingEndpoints: workingTests.length,
      recommendedEndpoint: workingTests.find((t: any) => t.name.includes('sendText'))?.url || null,
      status: workingTests.length > 0 ? 'partial' : 'failed'
    }

    if (results.sendTest?.ok) {
      results.summary.status = 'working'
      results.summary.recommendedEndpoint = results.sendTest.endpoint
    }

    console.log('🔍 [Evolution Test] Complete!')
    console.log('   Summary:', JSON.stringify(results.summary))

    return new Response(JSON.stringify({
      success: true,
      ...results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('❌ [Evolution Test] Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
