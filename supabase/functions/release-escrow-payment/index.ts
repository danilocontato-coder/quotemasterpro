import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAsaasConfig } from '../_shared/asaas-utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { paymentId, retryAttempt = 0 } = await req.json()
    console.log(`🔓 Liberando escrow para pagamento: ${paymentId} (tentativa ${retryAttempt + 1})`)

    // Buscar dados do pagamento
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        suppliers!inner(id, name, email, asaas_wallet_id, bank_data),
        clients!inner(id, name),
        quotes!inner(id, local_code, title)
      `)
      .eq('id', paymentId)
      .eq('status', 'in_escrow')
      .single()

    if (paymentError || !payment) {
      console.error('❌ Pagamento não encontrado ou não está em escrow:', paymentError)
      return new Response(
        JSON.stringify({ error: 'Pagamento não encontrado ou não está em escrow' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar wallet do fornecedor
    if (!payment.suppliers.asaas_wallet_id) {
      console.error('❌ Fornecedor não possui wallet Asaas')
      
      // Criar registro de erro para retry
      await supabase.from('escrow_release_errors').insert({
        payment_id: paymentId,
        error_type: 'missing_wallet',
        error_message: 'Fornecedor não possui wallet Asaas configurada',
        retry_count: retryAttempt,
        next_retry_at: new Date(Date.now() + 3600000).toISOString() // 1 hora
      })
      
      return new Response(
        JSON.stringify({ error: 'Fornecedor não possui wallet Asaas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calcular valores - usar supplier_net_amount se disponível
    const supplierNetAmount = payment.supplier_net_amount || (payment.base_amount ? payment.base_amount * 0.95 : payment.amount * 0.95);
    const platformCommission = payment.platform_commission || (payment.base_amount ? payment.base_amount * 0.05 : payment.amount * 0.05);
    const baseAmount = payment.base_amount || payment.amount;

    console.log(`💰 Valores do pagamento:`, {
      base_amount: baseAmount,
      platform_commission: platformCommission,
      supplier_net_amount: supplierNetAmount,
      asaas_fee: payment.asaas_fee || 0
    });

    // Obter configuração Asaas
    const { apiKey, baseUrl } = await getAsaasConfig(supabase)

    // Criar transferência via API Asaas
    console.log(`📤 Criando transferência para wallet: ${payment.suppliers.asaas_wallet_id}`)
    
    const transferResponse = await fetch(`${baseUrl}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      },
      body: JSON.stringify({
        walletId: payment.suppliers.asaas_wallet_id,
        value: supplierNetAmount,
        description: `Cotação ${payment.quotes.local_code} - Líquido após comissão`,
        operationType: 'PIX'
      })
    })

    if (!transferResponse.ok) {
      const error = await transferResponse.json()
      console.error('❌ Erro ao criar transferência Asaas:', error)
      
      // Determinar se deve fazer retry
      const shouldRetry = retryAttempt < 3 // Máximo 3 tentativas
      const nextRetryHours = Math.pow(2, retryAttempt) // Exponential backoff: 1h, 2h, 4h
      
      await supabase.from('escrow_release_errors').insert({
        payment_id: paymentId,
        error_type: 'transfer_failed',
        error_message: error.errors?.[0]?.description || 'Erro ao criar transferência',
        error_details: error,
        retry_count: retryAttempt,
        next_retry_at: shouldRetry 
          ? new Date(Date.now() + nextRetryHours * 3600000).toISOString()
          : null
      })
      
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao criar transferência no Asaas',
          details: error,
          willRetry: shouldRetry,
          nextRetry: shouldRetry ? `${nextRetryHours}h` : null
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const transferData = await transferResponse.json()
    console.log('✅ Transferência criada com sucesso:', transferData)

    // Atualizar status do pagamento
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        transfer_status: 'completed',
        transfer_date: new Date().toISOString(),
        asaas_transfer_id: transferData.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    // Atualizar status da cotação
    await supabase
      .from('quotes')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.quote_id)

    // Log de auditoria
    await supabase.from('audit_logs').insert({
      action: 'ESCROW_RELEASED',
      entity_type: 'payments',
      entity_id: paymentId,
      user_id: null, // Sistema
      panel_type: 'system',
      details: {
        payment_id: paymentId,
        quote_id: payment.quote_id,
        supplier_id: payment.supplier_id,
        supplier_name: payment.suppliers.name,
        base_amount: baseAmount,
        platform_commission: platformCommission,
        supplier_net_amount: supplierNetAmount,
        transfer_id: transferData.id,
        retry_attempt: retryAttempt
      }
    })

    // Notificar fornecedor
    await supabase.rpc('create_notification', {
      p_user_id: payment.supplier_id,
      p_title: '💰 Pagamento Liberado',
      p_message: `R$ ${supplierNetAmount.toFixed(2)} foram transferidos para sua Wallet Asaas (cotação ${payment.quotes.local_code})`,
      p_type: 'payment',
      p_priority: 'high',
      p_action_url: '/supplier/receivables'
    })

    console.log(`✅ Escrow liberado com sucesso: ${paymentId}`)

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentId,
        transfer_id: transferData.id,
        supplier_received: supplierNetAmount,
        platform_commission: platformCommission,
        message: 'Pagamento liberado e transferido com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erro ao liberar escrow:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
