export type EvoScope = 'client' | 'global' | 'env' | 'none'

export interface EvolutionConfig {
  apiUrl: string
  token: string
  instance?: string | null
  scope: EvoScope
}

// Normalize to digits and ensure default country code
export function normalizePhone(input: string, defaultCountry = '55'): string {
  const digits = (input || '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith(defaultCountry) ? digits : `${defaultCountry}${digits}`
}

export function buildEndpoints(cfg: EvolutionConfig): string[] {
  const baseRaw = cfg.apiUrl.replace(/\/+$/, '')
  const endpoints: string[] = []
  const instance = cfg.instance ? encodeURIComponent(cfg.instance) : null

  // Based on https://evolution.iadc.cloud, try these specific patterns:
  if (instance) {
    // Most common Evolution API patterns
    endpoints.push(
      `${baseRaw}/message/sendText/${instance}`,
      `${baseRaw}/message/send/${instance}`,
      `${baseRaw}/messages/sendText/${instance}`,
      `${baseRaw}/chat/sendText/${instance}`,
      `${baseRaw}/sendMessage/${instance}`,
      `${baseRaw}/api/message/sendText/${instance}`,
      `${baseRaw}/api/message/send/${instance}`,
      `${baseRaw}/api/sendMessage/${instance}`,
      `${baseRaw}/v1/message/sendText/${instance}`,
      `${baseRaw}/v1/sendMessage/${instance}`,
      `${baseRaw}/${instance}/sendMessage`,
      `${baseRaw}/${instance}/message/sendText`,
      `${baseRaw}/${instance}/message/send`
    )
  }

  // Fallback without instance
  endpoints.push(
    `${baseRaw}/message/sendText`,
    `${baseRaw}/message/send`,
    `${baseRaw}/messages/sendText`,
    `${baseRaw}/chat/sendText`,
    `${baseRaw}/sendMessage`,
    `${baseRaw}/api/message/sendText`,
    `${baseRaw}/api/sendMessage`,
    `${baseRaw}/v1/sendMessage`
  )

  return endpoints
}

export async function sendEvolutionWhatsApp(cfg: EvolutionConfig, number: string, text: string) {
  const endpoints = buildEndpoints(cfg)
  
  // Try different header combinations
  const headersVariants: Record<string, string>[] = [
    { 'Content-Type': 'application/json', 'apikey': cfg.token },
    { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.token}` },
    { 'Content-Type': 'application/json', 'api-key': cfg.token },
    { 'Content-Type': 'application/json', 'x-api-key': cfg.token },
  ]
  
  // Try different payload formats
  const payloads: any[] = [
    { number, text },
    { number, textMessage: { text } },
    { phone: number, message: text },
    { to: number, message: text },
    { chatId: number, message: text },
    { recipient: number, body: text }
  ]

  let lastError = ''
  let lastEndpoint = ''
  
  for (const endpoint of endpoints) {
    for (const headers of headersVariants) {
      for (const body of payloads) {
        try {
          console.log(`Trying endpoint: ${endpoint} with headers: ${JSON.stringify(Object.keys(headers))} and payload keys: ${JSON.stringify(Object.keys(body))}`)
          
          const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          })
          
          if (res.ok) {
            const data = await res.json().catch(() => ({}))
            console.log(`Success on endpoint: ${endpoint}`)
            return { success: true, endpoint, messageId: data.messageId || data.id || `whatsapp_${Date.now()}` }
          } else {
            const txt = await res.text()
            lastError = `HTTP ${res.status} ${res.statusText} - ${txt}`
            lastEndpoint = endpoint
            console.log(`Failed ${endpoint}: ${res.status} ${txt.substring(0, 100)}`)
          }
        } catch (e: any) {
          lastError = e?.message || String(e)
          lastEndpoint = endpoint
          console.log(`Error on ${endpoint}: ${lastError}`)
        }
      }
    }
  }
  
  return { success: false, error: `${lastError} (last: ${lastEndpoint})`, tried_endpoints: endpoints }
}

// Resolve Evolution config with ENV priority for stability
export async function resolveEvolutionConfig(
  supabase: any,
  clientId?: string | null,
  preferGlobal: boolean = false
): Promise<EvolutionConfig> {
  let instance: string | null = null
  let apiUrl: string | null = null
  let token: string | null = null
  let scope: EvoScope = 'env'

  // Priority: ENV vars first for stability
  apiUrl = Deno.env.get('EVOLUTION_API_URL') || ''
  token = Deno.env.get('EVOLUTION_API_TOKEN') || ''
  instance = Deno.env.get('EVOLUTION_INSTANCE') || null
  
  if (apiUrl && token) {
    return { 
      apiUrl: apiUrl.replace(/\/+$/, ''), 
      token, 
      instance, 
      scope: 'env' 
    }
  }

  // Fallback to DB integrations if ENV not available
  try {
    if (preferGlobal) {
      const { data: evoGlobalInt } = await supabase
        .from('integrations')
        .select('configuration')
        .eq('integration_type', 'whatsapp_evolution')
        .eq('active', true)
        .is('client_id', null)
        .maybeSingle()
      const gcfg = evoGlobalInt?.configuration || null
      if (gcfg) {
        instance = instance || (gcfg.instance ?? gcfg['evolution_instance']) || null
        apiUrl = apiUrl || (gcfg.api_url ?? gcfg['evolution_api_url']) || null
        token = token || (gcfg.token ?? gcfg['evolution_token']) || null
        scope = 'global'
      }
    } else {
      if (clientId) {
        const { data: evoClientInt } = await supabase
          .from('integrations')
          .select('configuration')
          .eq('integration_type', 'whatsapp_evolution')
          .eq('active', true)
          .eq('client_id', clientId)
          .maybeSingle()
        const cfg = evoClientInt?.configuration || null
        if (cfg) {
          instance = (cfg.instance ?? cfg['evolution_instance']) || null
          apiUrl = (cfg.api_url ?? cfg['evolution_api_url']) || null
          token = (cfg.token ?? cfg['evolution_token']) || null
          scope = 'client'
        }
      }
      if (!apiUrl || !token) {
        const { data: evoGlobalInt } = await supabase
          .from('integrations')
          .select('configuration')
          .eq('integration_type', 'whatsapp_evolution')
          .eq('active', true)
          .is('client_id', null)
          .maybeSingle()
        const cfg = evoGlobalInt?.configuration || null
        if (cfg) {
          instance = instance || (cfg.instance ?? cfg['evolution_instance']) || null
          apiUrl = apiUrl || (cfg.api_url ?? cfg['evolution_api_url']) || null
          token = token || (cfg.token ?? cfg['evolution_token']) || null
          scope = scope === 'client' ? 'client' : 'global'
        }
      }
    }
  } catch (_) {}

  return { 
    apiUrl: (apiUrl || '').replace(/\/+$/, ''), 
    token: token || '', 
    instance, 
    scope 
  }
}