import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!
const evolutionApiToken = Deno.env.get('EVOLUTION_API_TOKEN')!

interface NotificationRequest {
  type: 'email' | 'whatsapp'
  to: string
  supplierName: string
  quoteData: {
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
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { type, to, supplierName, quoteData }: NotificationRequest = await req.json()

    console.log(`[NOTIFY] Enviando ${type} para ${supplierName} (${to})`)

    let result: any = { success: false }

    if (type === 'whatsapp') {
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

    } else if (type === 'email') {
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    await supabase.from('audit_logs').insert({
      action_type: 'NOTIFICATION_SENT',
      entity_type: 'quotes',
      entity_id: quoteData.quoteId,
      details: {
        type,
        to,
        supplierName,
        success: result.success,
        messageId: result.messageId,
        provider: result.provider
      }
    })

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