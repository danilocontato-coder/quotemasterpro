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
  const base = cfg.apiUrl.replace(/\/+$/, '')
  const endpoints: string[] = []
  if (cfg.instance) {
    endpoints.push(
      `${base}/message/sendText/${cfg.instance}`,
      `${base}/messages/sendText/${cfg.instance}`,
      `${base}/message/send/${cfg.instance}`,
    )
  }
  endpoints.push(
    `${base}/message/sendText`,
    `${base}/messages/sendText`,
    `${base}/message/send`,
  )
  return endpoints
}

export async function sendEvolutionWhatsApp(cfg: EvolutionConfig, number: string, text: string) {
  const endpoints = buildEndpoints(cfg)
  let lastError = ''
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: cfg.token },
        body: JSON.stringify({ number, text })
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        return { success: true, endpoint, messageId: data.messageId || `whatsapp_${Date.now()}` }
      } else {
        const txt = await res.text()
        lastError = `HTTP ${res.status} ${res.statusText} - ${txt}`
      }
    } catch (e: any) {
      lastError = e?.message || String(e)
    }
  }
  return { success: false, error: lastError, tried_endpoints: endpoints }
}

// Resolve Evolution config from DB (client→global) or env fallback
export async function resolveEvolutionConfig(supabase: any, clientId?: string | null): Promise<EvolutionConfig> {
  let instance: string | null = null
  let apiUrl: string | null = null
  let token: string | null = null
  let scope: EvoScope = 'env'

  try {
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
  } catch (_) {}

  // Env fallbacks
  apiUrl = (apiUrl || Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/+$/, '')
  token = token || Deno.env.get('EVOLUTION_API_TOKEN') || ''
  instance = instance || Deno.env.get('EVOLUTION_INSTANCE') || null
  if (!apiUrl || !token) scope = scope || 'env'

  return { apiUrl: apiUrl!, token: token!, instance, scope }
}
