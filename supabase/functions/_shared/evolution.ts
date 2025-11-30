export type EvoScope = 'client' | 'global' | 'env' | 'none'

export interface EvolutionConfig {
  apiUrl: string
  token: string
  instance?: string | null
  scope: EvoScope
  // Optional explicit send endpoint override (absolute URL or path supporting {instance})
  sendEndpoint?: string | null
}

// Normalize to digits and ensure default country code
export function normalizePhone(input: string, defaultCountry = '55'): string {
  const digits = (input || '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith(defaultCountry) ? digits : `${defaultCountry}${digits}`
}

export function buildEndpoints(cfg: EvolutionConfig): string[] {
  const baseRaw = (cfg.apiUrl || '').replace(/\/+$/, '')
  const endpoints: string[] = []
  const instance = cfg.instance ? encodeURIComponent(cfg.instance) : null

  // 1) Explicit override via env/config (supports absolute URL or relative path and {instance} placeholder)
  const override = (cfg as any).sendEndpoint as string | null | undefined
  if (override && override.trim()) {
    let target = override.trim()
    if (target.includes('{instance}')) {
      target = target.replace('{instance}', instance ?? '')
    }
    if (!/^https?:\/\//i.test(target)) {
      target = `${baseRaw}/${target.replace(/^\/+/, '')}`
    }
    endpoints.push(target.replace(/([^:]\/)\/+/g, '$1'))
    return endpoints
  }

  // 2) Evolution API v2 OFFICIAL endpoint (HIGHEST PRIORITY)
  // Documentação: https://doc.evolution-api.com/v2/pt/send-messages
  if (instance) {
    // Official v2 endpoint - MUST be first
    endpoints.push(`${baseRaw}/message/sendText/${instance}`)
  }

  // 3) Fewer fallbacks - only common alternatives
  if (instance) {
    endpoints.push(
      `${baseRaw}/${instance}/sendText`,
      `${baseRaw}/api/message/sendText/${instance}`
    )
  }

  return endpoints
}

export async function sendEvolutionWhatsApp(cfg: EvolutionConfig, number: string, text: string) {
  const endpoints = buildEndpoints(cfg)
  
  console.log(`🔍 [Evolution] Starting WhatsApp send to ${number}`)
  console.log(`🔍 [Evolution] Config: apiUrl=${cfg.apiUrl}, instance=${cfg.instance}, scope=${cfg.scope}`)
  console.log(`🔍 [Evolution] Will try ${endpoints.length} endpoint(s): ${endpoints.join(', ')}`)
  
  // Evolution API v2 official header - apikey is the standard
  // Ref: https://doc.evolution-api.com/v2/pt/authentication
  const headersVariants: Record<string, string>[] = [
    { 'Content-Type': 'application/json', 'apikey': cfg.token },  // v2 official
    { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.token}` },
    { 'Content-Type': 'application/json', 'Authorization': `${cfg.token}` },
  ]
  
  // Evolution API v2 official payload format
  // Ref: https://doc.evolution-api.com/v2/pt/send-messages
  const payloads: any[] = [
    { number, text },  // v2 official format
    { number, textMessage: { text } },  // alternative v2 format
  ]

  let lastError = ''
  let lastEndpoint = ''
  let lastResponse = ''
  let attemptCount = 0
  
  for (const endpoint of endpoints) {
    for (const headers of headersVariants) {
      for (const body of payloads) {
        try {
          attemptCount++
          const headerKeys = Object.keys(headers).filter(k => k !== 'Content-Type')
          console.log(`[${attemptCount}] POST ${endpoint}`)
          console.log(`    Auth: ${headerKeys.join(', ')}`)
          console.log(`    Body: ${JSON.stringify(body)}`)
          
          const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          })
          
          const responseText = await res.text()
          let responseData: any = null
          try { responseData = JSON.parse(responseText) } catch { responseData = responseText }
          
          console.log(`    Response: ${res.status} ${res.statusText}`)
          console.log(`    Body: ${responseText.substring(0, 300)}`)
          
          if (res.ok) {
            console.log(`✅ SUCCESS! Endpoint: ${endpoint}`)
            return { 
              success: true, 
              endpoint, 
              messageId: responseData?.key?.id || responseData?.messageId || responseData?.id || `whatsapp_${Date.now()}`,
              response: responseData
            }
          } else {
            lastError = `HTTP ${res.status} - ${responseText.substring(0, 150)}`
            lastEndpoint = endpoint
            lastResponse = responseText.substring(0, 300)
          }
        } catch (e: any) {
          lastError = e?.message || String(e)
          lastEndpoint = endpoint
          console.log(`    Exception: ${lastError}`)
        }
      }
    }
  }
  
  console.error(`⚠️ [Evolution] All ${attemptCount} attempts failed`)
  console.error(`⚠️ Last endpoint: ${lastEndpoint}`)
  console.error(`⚠️ Last error: ${lastError}`)
  console.error(`⚠️ Last response: ${lastResponse}`)
  console.error(`⚠️ Suggestion: Verify instance "${cfg.instance}" exists and is connected at ${cfg.apiUrl}`)
  
  return { 
    success: false, 
    error: `All ${attemptCount} attempts failed. Last: ${lastError}`,
    lastEndpoint,
    lastResponse,
    suggestion: `Verify instance "${cfg.instance}" exists and is connected. Check logs at Evolution API dashboard.`
  }
}

// Resolve Evolution config with DB integration priority over ENV for admin control
export async function resolveEvolutionConfig(
  supabase: any,
  clientId?: string | null,
  preferGlobal: boolean = false
): Promise<EvolutionConfig> {
  let instance: string | null = null
  let apiUrl: string | null = null
  let token: string | null = null
  let scope: EvoScope = 'none'
  let sendEndpoint: string | null = null

  // Priority 1: DB integrations (superadmin control)
  try {
    const pickCfgFields = (cfg: any) => {
      if (!cfg) return
      instance = instance || (cfg.instance ?? cfg['evolution_instance']) || null
      apiUrl = apiUrl || (cfg.api_url ?? cfg['evolution_api_url']) || null
      token = token || (cfg.token ?? cfg['evolution_token']) || null
      sendEndpoint = sendEndpoint || (cfg.send_endpoint ?? cfg['evolution_send_endpoint']) || null
    }

    if (preferGlobal) {
      const { data: evoGlobalInt } = await supabase
        .from('integrations')
        .select('configuration')
        .eq('integration_type', 'whatsapp_evolution')
        .eq('active', true)
        .is('client_id', null)
        .maybeSingle()
      const gcfg = evoGlobalInt?.configuration || null
      pickCfgFields(gcfg)
      if (apiUrl && token) scope = 'global'
    } else {
      if (clientId) {
        const { data: evoClientInt } = await supabase
          .from('integrations')
          .select('configuration')
          .eq('integration_type', 'whatsapp_evolution')
          .eq('active', true)
          .eq('client_id', clientId)
          .maybeSingle()
        const ccfg = evoClientInt?.configuration || null
        pickCfgFields(ccfg)
        if (apiUrl && token) scope = 'client'
      }
      if (!apiUrl || !token) {
        const { data: evoGlobalInt } = await supabase
          .from('integrations')
          .select('configuration')
          .eq('integration_type', 'whatsapp_evolution')
          .eq('active', true)
          .is('client_id', null)
          .maybeSingle()
        const gcfg = evoGlobalInt?.configuration || null
        pickCfgFields(gcfg)
        if (apiUrl && token && scope !== 'client') scope = 'global'
      }
    }
  } catch (_) {}

  // Priority 2: ENV vars as fallback (only if DB integration not found)
  if (!apiUrl || !token) {
    apiUrl = apiUrl || Deno.env.get('EVOLUTION_API_URL') || ''
    token = token || Deno.env.get('EVOLUTION_API_TOKEN') || ''
    instance = instance || Deno.env.get('EVOLUTION_INSTANCE') || null
    sendEndpoint = sendEndpoint || Deno.env.get('EVOLUTION_SEND_ENDPOINT') || null
    
    if (apiUrl && token && scope === 'none') {
      scope = 'env'
    }
  }

  return { 
    apiUrl: (apiUrl || '').replace(/\/+$/, ''), 
    token: token || '', 
    instance, 
    scope,
    sendEndpoint
  }
}
