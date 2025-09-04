import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!
const evolutionApiToken = Deno.env.get('EVOLUTION_API_TOKEN')!

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { type, to, supplier_id, supplier_name, supplier_email, supplier_whatsapp, quoteData, user_id, user_name, user_email, temp_password, app_url }: NotificationRequest = await req.json()

    console.log(`[NOTIFY] Processando notificação tipo ${type}`)

    let result: any = { success: false }

    if (type === 'certification') {
      // Handle supplier certification notification
      if (!supplier_id || !supplier_name) {
        throw new Error('supplier_id e supplier_name são obrigatórios para certificação')
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Get supplier details
      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplier_id)
        .single()

      if (supplierError || !supplier) {
        throw new Error('Fornecedor não encontrado')
      }

      // Create notification record in database
      await supabase.from('notifications').insert({
        user_id: null, // Will be set if we have a user account for the supplier
        title: 'Parabéns! Você foi certificado',
        message: `Seu fornecedor "${supplier.name}" foi certificado pela plataforma QuoteMaster Pro. Agora você tem acesso a mais oportunidades de negócio e maior visibilidade para todos os clientes.`,
        type: 'certification',
        priority: 'high',
        metadata: {
          supplier_id: supplier_id,
          certification_date: new Date().toISOString()
        }
      })

      // Send WhatsApp notification if available
      if (supplier.whatsapp && evolutionApiUrl && evolutionApiToken) {
        const message = `🎉 *Parabéns! Fornecedor Certificado* 🎉\n\n` +
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

        try {
          const whatsappResponse = await fetch(`${evolutionApiUrl}/message/sendText`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiToken
            },
            body: JSON.stringify({
              number: supplier.whatsapp,
              text: message
            })
          })

          if (whatsappResponse.ok) {
            result = { success: true, method: 'whatsapp', messageId: `cert_${Date.now()}` }
            console.log(`[CERTIFICATION] WhatsApp enviado para ${supplier.whatsapp}`)
          } else {
            console.error('[CERTIFICATION] Erro no WhatsApp:', await whatsappResponse.text())
          }
        } catch (whatsappError) {
          console.error('[CERTIFICATION] Erro ao enviar WhatsApp:', whatsappError)
        }
      }

      // Send email notification if available (placeholder)
      if (supplier.email) {
        console.log(`[CERTIFICATION] Email de certificação seria enviado para ${supplier.email}`)
        // TODO: Implement email sending via Resend
      }

      if (!result.success) {
        result = { success: true, method: 'database', note: 'Notificação salva no banco' }
      }

      // Log the certification
      await supabase.from('audit_logs').insert({
        action: 'SUPPLIER_CERTIFIED',
        entity_type: 'suppliers',
        entity_id: supplier_id,
        details: {
          supplier_name: supplier.name,
          certification_date: new Date().toISOString(),
          notification_sent: result.success
        }
      })

  } else if (type === 'whatsapp_user_credentials') {
      // Send user credentials via WhatsApp
      if (!to || !user_email || !temp_password) {
        throw new Error('Campos obrigatórios ausentes: to, user_email, temp_password')
      }

      // Normalize number to digits only and ensure country code 55
      const normalize = (input: string) => (input || '').replace(/\D/g, '')
      let number = normalize(to)
      if (number && !number.startsWith('55')) {
        number = `55${number}`
      }

      const message =
        `👋 Olá${user_name ? ' ' + user_name : ''}!\n\n` +
        `Seu acesso ao *QuoteMaster Pro* foi criado. Seguem suas credenciais:\n\n` +
        `• E-mail: ${user_email}\n` +
        `• Senha temporária: ${temp_password}\n\n` +
        `${app_url ? `Acesse: ${app_url}\n\n` : ''}` +
        `Por segurança, você deverá alterar a senha no primeiro login.\n\n` +
        `Se não reconhece esta mensagem, ignore este aviso.`

      const base = evolutionApiUrl.replace(/\/+$/, '')
      const candidates = [
        `${base}/message/sendText`,
        `${base}/messages/sendText`,
        `${base}/message/send`,
      ]

      let lastErrorText = ''
      for (const endpoint of candidates) {
        try {
          const whatsappResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiToken,
            },
            body: JSON.stringify({ number, text: message })
          })

          if (whatsappResponse.ok) {
            const whatsappData = await whatsappResponse.json().catch(() => ({}))
            result = {
              success: true,
              messageId: whatsappData.messageId || `whatsapp_${Date.now()}`,
              provider: 'evolution-api',
              endpoint,
              number
            }
            console.log(`[WHATSAPP CREDENTIALS] Enviado com sucesso para ${number} via ${endpoint}`)
            break
          } else {
            const txt = await whatsappResponse.text()
            lastErrorText = `HTTP ${whatsappResponse.status} ${whatsappResponse.statusText} - ${txt}`
            console.warn(`[WHATSAPP CREDENTIALS] Falha em ${endpoint}:`, lastErrorText)
          }
        } catch (err) {
          lastErrorText = (err as Error).message
          console.warn(`[WHATSAPP CREDENTIALS] Erro de rede em ${endpoint}:`, lastErrorText)
        }
      }

      if (!result.success) {
        result = {
          success: false,
          error: `Falha na Evolution API. Verifique EVOLUTION_API_URL/TOKEN e endpoint. Último erro: ${lastErrorText}`,
          tried_endpoints: candidates,
          number
        }
      }

      // Audit log
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase.from('audit_logs').insert({
          action: 'USER_CREDENTIALS_SENT',
          entity_type: 'users',
          entity_id: user_id || user_email || 'unknown',
          details: {
            to: number,
            success: result.success,
            messageId: (result as any).messageId,
            provider: (result as any).provider,
            endpoints_tried: (result as any).tried_endpoints,
          }
        })
      } catch (logErr) {
        console.warn('[WHATSAPP CREDENTIALS] Falha ao registrar audit log:', logErr)
      }

    } else if (type === 'whatsapp' && quoteData) {
      // Original quote notification logic
      const supplierName = supplier_name || 'Fornecedor'
      // Enviar via Evolution API
      const message = `🏢 *Nova Cotação - ${quoteData.clientName}*\n\n` +
        `Olá ${supplierName}!\n\n` +
        `Você recebeu uma nova solicitação de cotação:\n\n` +
        `📋 *Título:* ${quoteData.quoteTitle}\n` +
        `🆔 *ID:* ${quoteData.quoteId}\n` +
        `⏰ *Prazo:* ${quoteData.deadline}\n` +
        `📦 *Itens:* ${quoteData.items.length} item(s)\n\n` +
        `*Itens solicitados:*\n` +
        quoteData.items.map(item => `• ${item.name} - Qtd: ${item.quantity}`).join('\n') +
        `\n\n📞 *Contato do cliente:* ${quoteData.clientContact}\n\n` +
        `Para responder esta cotação, acesse o sistema QuoteMaster Pro.`

      const whatsappResponse = await fetch(`${evolutionApiUrl}/message/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiToken
        },
        body: JSON.stringify({
          number: to,
          text: message
        })
      })

      if (whatsappResponse.ok) {
        const whatsappData = await whatsappResponse.json()
        result = {
          success: true,
          messageId: whatsappData.messageId || `whatsapp_${Date.now()}`,
          provider: 'evolution-api'
        }
        console.log(`[WHATSAPP] Enviado com sucesso para ${to}`)
      } else {
        const error = await whatsappResponse.text()
        console.error(`[WHATSAPP] Erro ao enviar para ${to}:`, error)
        result = {
          success: false,
          error: `Falha na Evolution API: ${error}`
        }
      }

    } else if (type === 'email' && quoteData) {
      // TODO: Implementar envio de email (SendGrid/Resend)
      console.log(`[EMAIL] Simulando envio para ${to}`)
      
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      result = {
        success: true,
        messageId: `email_${Date.now()}`,
        provider: 'mock'
      }
    }

    // Log da notificação
    if (quoteData) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      await supabase.from('audit_logs').insert({
        action: 'NOTIFICATION_SENT',
        entity_type: 'quotes',
        entity_id: quoteData.quoteId,
        details: {
          type,
          to,
          supplier_name: supplier_name,
          success: result.success,
          messageId: result.messageId,
          provider: result.provider
        }
      })
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.success ? 200 : 400
    })

  } catch (error) {
    console.error('[NOTIFY] Erro:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})