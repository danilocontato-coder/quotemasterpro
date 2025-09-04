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
  const bases: string[] = [baseRaw]
  // Try with optional /api suffix as many deployments mount under /api
  if (!/\/(api|api\/?)$/.test(baseRaw)) {
    bases.push(`${baseRaw}/api`)
  }

  const endpoints: string[] = []

  for (const base of bases) {
    const endsWithMessage = /\/(message|messages)$/.test(base)
    const withMsgBase = base
    const withoutMsgBase = base.replace(/\/(messages?)$/, '')
    const instance = cfg.instance ? encodeURIComponent(cfg.instance) : null

    if (instance) {
      if (endsWithMessage) {
        endpoints.push(
          `${withMsgBase}/sendText/${instance}`,
          `${withMsgBase}/send/${instance}`
        )
      }
      endpoints.push(
        `${base}/message/sendText/${instance}`,
        `${base}/messages/sendText/${instance}`,
        `${base}/message/send/${instance}`,
        `${withoutMsgBase}/message/sendText/${instance}`,
        `${withoutMsgBase}/messages/sendText/${instance}`,
        `${withoutMsgBase}/message/send/${instance}`,
      )
    }

    if (endsWithMessage) {
      endpoints.push(
        `${withMsgBase}/sendText`,
        `${withMsgBase}/send`
      )
    }

    endpoints.push(
      `${base}/message/sendText`,
      `${base}/messages/sendText`,
      `${base}/message/send`,
      `${withoutMsgBase}/message/sendText`,
      `${withoutMsgBase}/messages/sendText`,
      `${withoutMsgBase}/message/send`
    )
  }

  // Deduplicate while preserving order
  return Array.from(new Set(endpoints))
}

export async function sendEvolutionWhatsApp(cfg: EvolutionConfig, number: string, text: string) {
  const endpoints = buildEndpoints(cfg)
  const headersVariants: Record<string, string>[] = [
    { 'Content-Type': 'application/json', apikey: cfg.token },
    { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.token}` },
  ]
  const payloads: any[] = [
    { number, text },
    { phone: number, message: text },
  ]
  let lastError = ''
  let lastEndpoint = ''
  for (const endpoint of endpoints) {
    for (const headers of headersVariants) {
      for (const body of payloads) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          })
          if (res.ok) {
            const data = await res.json().catch(() => ({}))
            return { success: true, endpoint, messageId: data.messageId || `whatsapp_${Date.now()}` }
          } else {
            const txt = await res.text()
            lastError = `HTTP ${res.status} ${res.statusText} - ${txt}`
            lastEndpoint = endpoint
          }
        } catch (e: any) {
          lastError = e?.message || String(e)
          lastEndpoint = endpoint
        }
      }
    }
  }
  return { success: false, error: `${lastError} (last: ${lastEndpoint})`, tried_endpoints: endpoints }
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
