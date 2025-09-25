import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { resolveEvolutionConfig, normalizePhone, sendEvolutionWhatsApp } from '../_shared/evolution.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface NotificationRequest {
  type: 'email' | 'whatsapp' | 'certification' | 'whatsapp_user_credentials'
  to?: string
  supplier_id?: string
  supplier_name?: string
  supplier_email?: string
  supplier_whatsapp?: string
  quoteData?: {
    quoteId: string
    quoteTitle: string
    deadline: string
    items: Array<{
      name: string
      quantity: number
    }>
    clientName: string
    clientContact: string
  }
  // User credentials payload
  user_id?: string
  user_name?: string
  user_email?: string
  temp_password?: string
  app_url?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { type, to, supplier_id, supplier_name, quoteData, user_id, user_name, user_email, temp_password, app_url }: NotificationRequest = await req.json()

    console.log(`[NOTIFY] Processando notificação tipo ${type}`)

    let result: any = { success: false }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (type === 'certification') {
      if (!supplier_id || !supplier_name) {
        throw new Error('supplier_id e supplier_name são obrigatórios para certificação')
      }

      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplier_id)
        .single()

      if (supplierError || !supplier) {
        throw new Error('Fornecedor não encontrado')
      }

      await supabase.from('notifications').insert({
        user_id: null,
        title: 'Parabéns! Você foi certificado',
        message: `Seu fornecedor "${supplier.name}" foi certificado pela plataforma QuoteMaster Pro. Agora você tem acesso a mais oportunidades de negócio e maior visibilidade para todos os clientes.`,
        type: 'certification',
        priority: 'high',
        metadata: { supplier_id, certification_date: new Date().toISOString() }
      })

      if (supplier.whatsapp) {
        const cfg = await resolveEvolutionConfig(supabase, supplier.client_id || null)
        const phone = normalizePhone(supplier.whatsapp)
        const text = `🎉 *Parabéns! Fornecedor Certificado* 🎉\n\n` +
          `Olá ${supplier.name}!\n\n` +
          `É com grande prazer que informamos que sua empresa foi **CERTIFICADA** pela plataforma QuoteMaster Pro! 🏆\n\n` +
          `✅ *Benefícios da Certificação:*\n` +
          `• Visibilidade para TODOS os clientes da plataforma\n` +
          `• Prioridade no recebimento de cotações\n` +
          `• Selo de qualidade e confiabilidade\n` +
          `• Maior oportunidade de negócios\n\n` +
          `🚀 A partir de agora, você pode receber cotações de qualquer cliente da plataforma.\n\n` +
          `Obrigado por fazer parte da nossa rede de fornecedores certificados!\n\n` +
          `*QuoteMaster Pro - Conectando negócios*`
        const sent = await sendEvolutionWhatsApp(cfg, phone, text)
        if (sent.success) {
          result = { method: 'whatsapp', ...sent, success: true }
        } else {
          console.warn('[CERTIFICATION] Falha ao enviar WhatsApp:', sent.error)
        }
      }

      if (!result.success) {
        result = { success: true, method: 'database', note: 'Notificação salva no banco' }
      }

      await supabase.from('audit_logs').insert({
        action: 'SUPPLIER_CERTIFIED',
        entity_type: 'suppliers',
        entity_id: supplier_id,
        details: { supplier_name: supplier_name, certification_date: new Date().toISOString(), notification_sent: result.success }
      })

    } else if (type === 'whatsapp_user_credentials') {
      if (!to || !user_email || !temp_password) {
        throw new Error('Campos obrigatórios ausentes: to, user_email, temp_password')
      }

      let clientId: string | null = null
      try {
        if (user_id) {
          const { data: u } = await supabase.from('users').select('client_id').eq('id', user_id).maybeSingle()
          clientId = u?.client_id || null
        }
        if (!clientId && user_email) {
          const { data: u2 } = await supabase.from('users').select('client_id').eq('email', user_email).maybeSingle()
          clientId = u2?.client_id || null
        }
      } catch (e) { console.warn('[WHATSAPP CREDENTIALS] Falha ao obter client_id:', e) }

      const cfg = await resolveEvolutionConfig(supabase, clientId)
      const number = normalizePhone(to)
      const text =
        `👋 Olá${user_name ? ' ' + user_name : ''}!\n\n` +
        `Seu acesso ao *QuoteMaster Pro* foi criado. Seguem suas credenciais:\n\n` +
        `• E-mail: ${user_email}\n` +
        `• Senha temporária: ${temp_password}\n\n` +
        `${app_url ? `Acesse: ${app_url}\n\n` : ''}` +
        `Por segurança, você deverá alterar a senha no primeiro login.\n\n` +
        `Se não reconhece esta mensagem, ignore este aviso.`

      const sent = await sendEvolutionWhatsApp(cfg, number, text)
      result = sent.success
        ? { ...sent, number, config_scope: cfg.scope, success: true }
        : { success: false, error: `Falha na Evolution API. Escopo=${cfg.scope}. Último erro: ${sent.error}`, tried_endpoints: sent.tried_endpoints, number, evo_scope: cfg.scope }

      try {
        await supabase.from('audit_logs').insert({
          action: 'USER_CREDENTIALS_SENT',
          entity_type: 'users',
          entity_id: user_id || user_email || 'unknown',
          details: {
            to: number,
            success: result.success,
            messageId: (result as any).messageId,
            provider: 'evolution-api',
            endpoints_tried: (result as any).tried_endpoints,
            evo_scope: cfg.scope,
          }
        })
      } catch (logErr) { console.warn('[WHATSAPP CREDENTIALS] Falha ao registrar audit log:', logErr) }

    } else if (type === 'whatsapp' && quoteData) {
      const cfg = await resolveEvolutionConfig(supabase, null)
      const number = normalizePhone(to || '')
      const text = `🏢 *Nova Cotação - ${quoteData.clientName}*\n\n` +
        `Olá ${supplier_name || 'Fornecedor'}!\n\n` +
        `Você recebeu uma nova solicitação de cotação:\n\n` +
        `📋 *Título:* ${quoteData.quoteTitle}\n` +
        `🆔 *ID:* ${quoteData.quoteId}\n` +
        `⏰ *Prazo:* ${quoteData.deadline}\n` +
        `📦 *Itens:* ${quoteData.items.length} item(s)\n\n` +
        `*Itens solicitados:*\n` +
        quoteData.items.map(item => `• ${item.name} - Qtd: ${item.quantity}`).join('\n') +
        `\n\n📞 *Contato do cliente:* ${quoteData.clientContact}\n\n` +
        `Para responder esta cotação, acesse o sistema QuoteMaster Pro.`

      const sent = await sendEvolutionWhatsApp(cfg, number, text)
      result = sent.success
        ? { ...sent, success: true }
        : { success: false, error: `Falha na Evolution API: ${sent.error}` }

      await supabase.from('audit_logs').insert({
        action: 'NOTIFICATION_SENT',
        entity_type: 'quotes',
        entity_id: quoteData.quoteId,
        details: { type, to, supplier_name, success: result.success, messageId: (result as any).messageId, provider: 'evolution-api' }
      })

    } else if (type === 'email' && quoteData) {
      console.log(`[EMAIL] Simulando envio para ${to}`)
      await new Promise(resolve => setTimeout(resolve, 1000))
      result = { success: true, messageId: `email_${Date.now()}`, provider: 'mock' }
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error) {
    console.error('[NOTIFY] Erro:', error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  }
})
