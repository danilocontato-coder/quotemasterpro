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

  // 🔍 PHASE 3: Generate unique request ID for tracking
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`🔔 [${requestId}] === NEW NOTIFICATION REQUEST ===`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { quoteId, supplierId, supplierName, totalValue, responseId } = await req.json()
    console.log(`📥 [${requestId}] Request payload:`, { quoteId, supplierId, supplierName, totalValue, responseId });

    // 🔒 PHASE 3: Verificar se a proposta existe antes de notificar
    if (responseId) {
      const { data: existingResponse, error: responseError } = await supabase
        .from('quote_responses')
        .select('id, status')
        .eq('id', responseId)
        .maybeSingle();

      if (responseError) {
        console.error(`❌ [${requestId}] Error checking quote_response:`, responseError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to verify proposal existence',
            requestId 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }

      if (!existingResponse) {
        console.error(`❌ [${requestId}] CRITICAL: Proposal ${responseId} does NOT exist in database!`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Proposal not found in database',
            requestId,
            responseId
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }

      console.log(`✅ [${requestId}] Proposal verified in database:`, existingResponse);
    } else {
      console.warn(`⚠️ [${requestId}] No responseId provided - skipping verification`);
    }

    // Get quote and client details
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        id,
        local_code,
        title,
        total,
        client_id,
        clients!quotes_client_id_fkey(
          id,
          name,
          phone
        )
      `)
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      console.error(`❌ [${requestId}] Error fetching quote:`, quoteError)
      throw new Error('Quote not found')
    }

    const client = quote.clients
    
    console.log(`🔍 [${requestId}] Quote and client details:`, {
      quoteId,
      quoteLocalCode: quote.local_code,
      quoteTitle: quote.title,
      clientId: client.id,
      clientName: client.name,
      supplierId,
      supplierName,
      totalValue
    })

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
      .replace(/\{\{quote_id\}\}/g, quote.local_code || quoteId)
      .replace(/\{\{supplier_name\}\}/g, supplierName)
      .replace(/\{\{total_value\}\}/g, totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))

    // Try to send WhatsApp notification
    let whatsappResult = null
    if (evolutionConfig.apiUrl && evolutionConfig.token && client.phone) {
      const normalizedPhone = normalizePhone(client.phone)
      if (normalizedPhone) {
        console.log(`📱 [${requestId}] Sending WhatsApp to:`, normalizedPhone)
        whatsappResult = await sendEvolutionWhatsApp(evolutionConfig, normalizedPhone, message)
        
        if (whatsappResult.success) {
          console.log(`✅ [${requestId}] WhatsApp sent successfully:`, whatsappResult.messageId)
        } else {
          console.error(`❌ [${requestId}] WhatsApp failed:`, whatsappResult.error)
        }
      } else {
        console.warn(`⚠️ [${requestId}] Invalid phone number:`, client.phone)
      }
    } else {
      console.warn(`⚠️ [${requestId}] WhatsApp config incomplete:`, {
        hasApiUrl: !!evolutionConfig.apiUrl,
        hasToken: !!evolutionConfig.token,
        hasPhone: !!client.phone
      })
    }

    // Create notifications for all client users
    if (clientUsers && clientUsers.length > 0) {
      console.log(`📩 [${requestId}] Creating in-app notifications for ${clientUsers.length} users`)
      
      const notifications = clientUsers.map(user => ({
        user_id: user.id,
        title: 'Nova Proposta Recebida',
        message: `${supplierName} enviou uma proposta para a cotação #${quote.local_code || quoteId} - ${quote.title}`,
        type: 'proposal',
        priority: 'normal',
        action_url: `/quotes?highlight=${quoteId}`,
        metadata: {
          quote_id: quoteId,
          supplier_id: supplierId,
          supplier_name: supplierName,
          total_value: totalValue,
          whatsapp_sent: whatsappResult?.success || false,
          request_id: requestId
        }
      }))

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notifError) {
        console.error(`❌ [${requestId}] Error creating notifications:`, notifError)
      } else {
        console.log(`✅ [${requestId}] In-app notifications created successfully`)
      }
    } else {
      console.warn(`⚠️ [${requestId}] No client users found to notify`)
    }

    // Log the notification summary
    console.log(`📝 [${requestId}] === NOTIFICATION SUMMARY ===`, {
      whatsappSent: whatsappResult?.success || false,
      inAppNotifications: clientUsers?.length || 0,
      clientPhone: client.phone,
      normalizedPhone: client.phone ? normalizePhone(client.phone) : null
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Client notified successfully',
        whatsappSent: whatsappResult?.success || false,
        requestId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(`❌ [${requestId || 'UNKNOWN'}] Error in notify-client-proposal:`, error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as any)?.message || 'Unknown error',
        requestId: requestId || 'UNKNOWN'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})