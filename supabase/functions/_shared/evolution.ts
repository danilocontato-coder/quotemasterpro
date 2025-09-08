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

// Resolve Evolution config from DB (client→global) or env fallback
// Resolve Evolution config from DB with flexible priority
export async function resolveEvolutionConfig(
  supabase: any,
  clientId?: string | null,
  preferGlobal: boolean = false
): Promise<EvolutionConfig> {
  let instance: string | null = null
  let apiUrl: string | null = null
  let token: string | null = null
  let scope: EvoScope = 'env'

  try {
    if (preferGlobal) {
      // 1) Try SuperAdmin (global) first - legacy table
      const { data: evoGlobalInt } = await supabase
        .from('integrations')
        .select('configuration')
        .eq('integration_type', 'whatsapp_evolution')
        .eq('active', true)
        .is('client_id', null)
        .maybeSingle()
      const gcfg = evoGlobalInt?.configuration || null
      if (gcfg) {
        instance = (gcfg.instance ?? gcfg['evolution_instance']) || null
        apiUrl = (gcfg.api_url ?? gcfg['evolution_api_url']) || null
        token = (gcfg.token ?? gcfg['evolution_token']) || null
        scope = 'global'
      }
      // 1b) Fallback to api_integrations (global)
      if (!apiUrl || !token) {
        const { data: evoGlobalAI } = await supabase
          .from('api_integrations')
          .select('settings, api_key_encrypted')
          .eq('type', 'whatsapp')
          .eq('active', true)
          .eq('scope', 'global')
          .maybeSingle()
        const g2 = (evoGlobalAI as any)?.settings || null
        if (g2) {
          instance = instance || (g2.instance ?? g2['evolution_instance']) || null
          apiUrl = apiUrl || (g2.api_url ?? g2['evolution_api_url']) || null
          token = token || (g2.token ?? g2['evolution_token'] ?? (evoGlobalAI as any)?.api_key_encrypted) || null
          scope = 'global'
        }
      }
      // 2) Then client-specific (to allow overrides)
      if ((!apiUrl || !token) && clientId) {
        const { data: evoClientInt } = await supabase
          .from('integrations')
          .select('configuration')
          .eq('integration_type', 'whatsapp_evolution')
          .eq('active', true)
          .eq('client_id', clientId)
          .maybeSingle()
        const ccfg = evoClientInt?.configuration || null
        if (ccfg) {
          instance = instance || (ccfg.instance ?? ccfg['evolution_instance']) || null
          apiUrl = apiUrl || (ccfg.api_url ?? ccfg['evolution_api_url']) || null
          token = token || (ccfg.token ?? ccfg['evolution_token']) || null
          scope = apiUrl && token ? (scope === 'global' ? 'global' : 'client') : scope
        }
        // 2b) Fallback api_integrations (client)
        if (!apiUrl || !token) {
          const { data: evoClientAI } = await supabase
            .from('api_integrations')
            .select('settings, api_key_encrypted')
            .eq('type', 'whatsapp')
            .eq('active', true)
            .eq('scope', 'client')
            .eq('target_id', clientId)
            .maybeSingle()
          const c2 = (evoClientAI as any)?.settings || null
          if (c2) {
            instance = instance || (c2.instance ?? c2['evolution_instance']) || null
            apiUrl = apiUrl || (c2.api_url ?? c2['evolution_api_url']) || null
            token = token || (c2.token ?? c2['evolution_token'] ?? (evoClientAI as any)?.api_key_encrypted) || null
            scope = 'client'
          }
        }
      }
    } else {
      // Default behavior: client → global
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
        // client via api_integrations
        if (!apiUrl || !token) {
          const { data: evoClientAI } = await supabase
            .from('api_integrations')
            .select('settings, api_key_encrypted')
            .eq('type', 'whatsapp')
            .eq('active', true)
            .eq('scope', 'client')
            .eq('target_id', clientId)
            .maybeSingle()
          const c2 = (evoClientAI as any)?.settings || null
          if (c2) {
            instance = instance || (c2.instance ?? c2['evolution_instance']) || null
            apiUrl = apiUrl || (c2.api_url ?? c2['evolution_api_url']) || null
            token = token || (c2.token ?? c2['evolution_token'] ?? (evoClientAI as any)?.api_key_encrypted) || null
            scope = 'client'
          }
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
        // global via api_integrations
        if (!apiUrl || !token) {
          const { data: evoGlobalAI } = await supabase
            .from('api_integrations')
            .select('settings, api_key_encrypted')
            .eq('type', 'whatsapp')
            .eq('active', true)
            .eq('scope', 'global')
            .maybeSingle()
          const g2 = (evoGlobalAI as any)?.settings || null
          if (g2) {
            instance = instance || (g2.instance ?? g2['evolution_instance']) || null
            apiUrl = apiUrl || (g2.api_url ?? g2['evolution_api_url']) || null
            token = token || (g2.token ?? g2['evolution_token'] ?? (evoGlobalAI as any)?.api_key_encrypted) || null
            scope = scope === 'client' ? 'client' : 'global'
          }
        }
      }
    }
  } catch (_) {}

  // Env fallbacks (only if DB didn’t provide)
  apiUrl = Deno.env.get('EVOLUTION_API_URL') || apiUrl || ''
  token = Deno.env.get('EVOLUTION_API_TOKEN') || token || ''
  instance = instance || Deno.env.get('EVOLUTION_INSTANCE') || null
  if (!apiUrl || !token) scope = scope || 'env'

  return { apiUrl: apiUrl!, token: token!, instance, scope }
}
