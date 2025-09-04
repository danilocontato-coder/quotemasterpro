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
    
    // Format message
    const message = `🎯 *Nova Proposta Recebida!*

📋 *Cotação:* ${quote.title} (${quoteId})
🏢 *Fornecedor:* ${supplierName}
💰 *Valor Total:* R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

✅ Uma nova proposta foi enviada para sua cotação. Acesse o sistema para avaliar os detalhes.

_QuoteMaster Pro - Gestão Inteligente de Cotações_`

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
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})