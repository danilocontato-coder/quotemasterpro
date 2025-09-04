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

    // Try to resolve Evolution configuration for this client
    const evolutionConfig = await resolveEvolutionConfig(supabase, client.id)
    
    if (!evolutionConfig.apiUrl || !evolutionConfig.token) {
      console.log('⚠️ No Evolution configuration found, skipping WhatsApp notification')
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Evolution API not configured' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format message
    const message = `🎯 *Nova Proposta Recebida!*

📋 *Cotação:* ${quote.title} (${quoteId})
🏢 *Fornecedor:* ${supplierName}
💰 *Valor Total:* R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

✅ Uma nova proposta foi enviada para sua cotação. Acesse o sistema para avaliar os detalhes.

_QuoteMaster Pro - Gestão Inteligente de Cotações_`

    // Try to send WhatsApp notification
    let whatsappResult = null
    if (client.phone) {
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

    // Create notification in database
    await supabase
      .from('notifications')
      .insert({
        user_id: client.id, // This should be the client user ID, but we'll use client ID for now
        title: 'Nova Proposta Recebida',
        message: `${supplierName} enviou uma proposta para a cotação ${quote.title}`,
        type: 'proposal',
        priority: 'normal',
        metadata: {
          quote_id: quoteId,
          supplier_id: supplierId,
          supplier_name: supplierName,
          total_value: totalValue,
          whatsapp_sent: whatsappResult?.success || false
        }
      })

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