import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveEvolutionConfig, sendEvolutionWhatsApp, normalizePhone } from '../_shared/evolution.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { quoteId, supplierId, supplierName, totalValue } = await req.json()

    console.log('🔔 Notifying client about proposal:', {
      quoteId,
      supplierId,
      supplierName,
      totalValue
    })

    // Get quote and client details
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        clients!inner(*)
      `)
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      console.error('❌ Error fetching quote:', quoteError)
      throw new Error('Quote not found')
    }

    const client = quote.clients

    // Get users from this client to notify them
    const { data: clientUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, name')
      .eq('client_id', client.id)

    if (usersError) {
      console.error('❌ Error fetching client users:', usersError)
    }

    // Try to resolve Evolution configuration for this client
    const evolutionConfig = await resolveEvolutionConfig(supabase, client.id)
    
    // Get custom message template from templates
    let messageTemplate = `🎯 *Nova Proposta Recebida!*

📋 *Cotação:* {{quote_title}} ({{quote_id}})
🏢 *Fornecedor:* {{supplier_name}}
💰 *Valor Total:* R$ {{total_value}}

✅ Uma nova proposta foi enviada para sua cotação. Acesse o sistema para avaliar os detalhes.

_QuoteMaster Pro - Gestão Inteligente de Cotações_`

    try {
      // First try to find a client-specific default template
      let templateQuery = supabase
        .from('whatsapp_templates')
        .select('message_content')
        .eq('template_type', 'proposal_received_whatsapp')
        .eq('active', true)
        .eq('client_id', client.id)
        .eq('is_default', true)
        .maybeSingle()

      let { data: templateData } = await templateQuery

      // If no client-specific default, try global default
      if (!templateData) {
        const { data: globalTemplate } = await supabase
          .from('whatsapp_templates')
          .select('message_content')
          .eq('template_type', 'proposal_received_whatsapp')
          .eq('active', true)
          .eq('is_global', true)
          .eq('is_default', true)
          .maybeSingle()
        
        templateData = globalTemplate
      }

      // If no default templates, fall back to any active template
      if (!templateData) {
        const { data: fallbackTemplate } = await supabase
          .from('whatsapp_templates')
          .select('message_content')
          .eq('template_type', 'proposal_received_whatsapp')
          .eq('active', true)
          .or(`client_id.eq.${client.id},is_global.eq.true`)
          .order('is_global', { ascending: true })
          .limit(1)
          .maybeSingle()
        
        templateData = fallbackTemplate
      }

      if (templateData?.message_content) {
        messageTemplate = templateData.message_content
      }
    } catch (error) {
      console.log('⚠️ Using default message template:', error)
    }
    
    // Format message with variables
    const message = messageTemplate
      .replace(/\{\{quote_title\}\}/g, quote.title)
      .replace(/\{\{quote_id\}\}/g, quoteId)
      .replace(/\{\{supplier_name\}\}/g, supplierName)
      .replace(/\{\{total_value\}\}/g, totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))

    // Try to send WhatsApp notification
    let whatsappResult = null
    if (evolutionConfig.apiUrl && evolutionConfig.token && client.phone) {
      const normalizedPhone = normalizePhone(client.phone)
      if (normalizedPhone) {
        console.log('📱 Sending WhatsApp to:', normalizedPhone)
        whatsappResult = await sendEvolutionWhatsApp(evolutionConfig, normalizedPhone, message)
        
        if (whatsappResult.success) {
          console.log('✅ WhatsApp sent successfully:', whatsappResult.messageId)
        } else {
          console.error('❌ WhatsApp failed:', whatsappResult.error)
        }
      }
    }

    // Create notifications for all client users
    if (clientUsers && clientUsers.length > 0) {
      const notifications = clientUsers.map(user => ({
        user_id: user.id,
        title: 'Nova Proposta Recebida',
        message: `${supplierName} enviou uma proposta para a cotação ${quote.title}`,
        type: 'proposal',
        priority: 'normal',
        action_url: `/quotes?highlight=${quoteId}`,
        metadata: {
          quote_id: quoteId,
          supplier_id: supplierId,
          supplier_name: supplierName,
          total_value: totalValue,
          whatsapp_sent: whatsappResult?.success || false
        }
      }))

      await supabase
        .from('notifications')
        .insert(notifications)
    }

    // Log the notification attempt
    console.log('📝 Notification logged:', {
      whatsappSent: whatsappResult?.success || false,
      phone: client.phone,
      normalizedPhone: client.phone ? normalizePhone(client.phone) : null
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Client notified successfully',
        whatsapp_sent: whatsappResult?.success || false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in notify-client-proposal:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as any)?.message || 'Unknown error' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})