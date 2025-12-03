import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAsaasConfig } from '../_shared/asaas-utils.ts'
import { detectPixKeyType, cleanPixKey } from '../_shared/pix-utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 [RELEASE-ESCROW] Iniciando função...')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { paymentId, retryAttempt = 0 } = await req.json()
    console.log(`🔓 [RELEASE-ESCROW] Liberando escrow para pagamento: ${paymentId} (tentativa ${retryAttempt + 1})`)

    // Buscar dados do pagamento
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        suppliers!payments_supplier_id_fkey!inner(id, name, email, cnpj, bank_data, pix_key),
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

    // Validar dados bancários do fornecedor
    const supplier = payment.suppliers;
    const bankData = supplier.bank_data;
    const pixKey = supplier.pix_key || bankData?.pix_key;
    
    console.log(`🔍 [RELEASE-ESCROW] Dados do fornecedor:`, {
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      has_pix_key: !!pixKey,
      pix_key_raw: pixKey,
      has_bank_data: !!bankData,
      bank_account: bankData?.account_number || null
    })

    // Verificar se possui chave PIX ou dados bancários completos
    if (!pixKey && (!bankData?.account_number || !bankData?.bank_code)) {
      console.error('❌ Fornecedor não possui dados bancários configurados')
      
      // Criar registro de erro para retry
      await supabase.from('escrow_release_errors').insert({
        payment_id: paymentId,
        error_type: 'missing_bank_data',
        error_message: 'Fornecedor não possui chave PIX ou dados bancários completos',
        retry_count: retryAttempt,
        next_retry_at: new Date(Date.now() + 3600000).toISOString() // 1 hora
      })
      
      return new Response(
        JSON.stringify({ 
          error: 'Fornecedor não possui dados bancários configurados',
          requires_manual_transfer: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obter configuração Asaas
    const { apiKey, baseUrl } = await getAsaasConfig(supabase)

    // Construir payload para transferência
    let transferPayload: any = {
      value: supplierNetAmount,
      description: `Cotação ${payment.quotes.local_code} - Líquido após comissão`
    }

    // Priorizar chave PIX se disponível
    if (pixKey) {
      const cleanedPixKey = cleanPixKey(pixKey);
      const pixType = detectPixKeyType(cleanedPixKey);
      
      console.log(`🧹 [RELEASE-ESCROW] Limpeza de chave PIX:`, {
        original: pixKey,
        cleaned: cleanedPixKey,
        type: pixType
      })
      
      console.log(`📤 [RELEASE-ESCROW] Criando transferência PIX`)
      transferPayload.pixAddressKey = cleanedPixKey
      transferPayload.pixAddressKeyType = pixType
    } else {
      // Usar dados bancários tradicionais
      console.log(`📤 Criando transferência bancária para: ${bankData.bank_code} - ${bankData.account_number}`)
      transferPayload.bankAccount = {
        bank: {
          code: bankData.bank_code
        },
        accountName: bankData.account_holder_name || supplier.name,
        ownerName: bankData.account_holder_name || supplier.name,
        cpfCnpj: supplier.cnpj,
        agency: bankData.agency,
        account: bankData.account_number,
        accountDigit: bankData.account_digit || '0'
      }
    }

    // Criar transferência via API Asaas
    console.log(`📡 [RELEASE-ESCROW] Enviando requisição para Asaas:`, {
      url: `${baseUrl}/transfers`,
      payload: transferPayload
    })
    
    const transferResponse = await fetch(`${baseUrl}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      },
      body: JSON.stringify(transferPayload)
    })
    
    console.log(`📥 [RELEASE-ESCROW] Resposta Asaas status: ${transferResponse.status}`)

    if (!transferResponse.ok) {
      const error = await transferResponse.json()
      console.error('❌ Erro ao criar transferência Asaas:', error)
      
      // Determinar se deve fazer retry
      const shouldRetry = retryAttempt < 3 // Máximo 3 tentativas
      const nextRetryHours = Math.pow(2, retryAttempt) // Exponential backoff: 1h, 2h, 4h
      
      // Registrar erro na tabela de erros
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

      // ✅ CORREÇÃO: Marcar pagamento com erro de transferência (não completed!)
      await supabase
        .from('payments')
        .update({
          transfer_status: 'failed',
          transfer_error: error.errors?.[0]?.description || 'Erro ao criar transferência',
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId)
      
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

    // ✅ CORREÇÃO: NÃO marcar como completed ainda! Marcar como transfer_pending
    // O status completed só será definido quando o webhook TRANSFER_DONE chegar
    await supabase
      .from('payments')
      .update({
        status: 'transfer_pending',  // ✅ Aguardando confirmação real da transferência
        transfer_status: 'pending',
        transfer_date: new Date().toISOString(),
        asaas_transfer_id: transferData.id,
        transfer_error: null,  // Limpar erros anteriores
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    // Registrar evento de transferência criada
    await supabase.from('supplier_transfer_events').insert({
      payment_id: paymentId,
      asaas_transfer_id: transferData.id,
      event_type: 'created',
      event_data: {
        value: supplierNetAmount,
        transfer_method: pixKey ? 'PIX' : 'TED',
        supplier_id: supplier.id,
        supplier_name: supplier.name
      }
    })

    // Log de auditoria
    await supabase.from('audit_logs').insert({
      action: 'ESCROW_TRANSFER_INITIATED',  // ✅ Mudança: "initiated" em vez de "released"
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
        transfer_method: pixKey ? 'PIX' : 'TED',
        pix_key: pixKey || null,
        retry_attempt: retryAttempt,
        status: 'pending_confirmation'  // ✅ Aguardando confirmação
      }
    })

    // Notificar fornecedor (informando que transferência foi iniciada)
    const transferMethod = pixKey ? 'via PIX' : 'via TED';
    await supabase.rpc('notify_supplier_users', {
      p_supplier_id: payment.supplier_id,
      p_title: '💸 Transferência Iniciada',
      p_message: `Transferência de R$ ${supplierNetAmount.toFixed(2)} ${transferMethod} foi iniciada (cotação ${payment.quotes.local_code}). Aguarde confirmação.`,
      p_type: 'payment',
      p_priority: 'high',
      p_action_url: '/supplier/receivables',
      p_metadata: {
        payment_id: paymentId,
        transfer_id: transferData.id,
        status: 'pending'
      }
    })

    console.log(`✅ Transferência iniciada com sucesso: ${paymentId} - Aguardando confirmação via webhook`)

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentId,
        transfer_id: transferData.id,
        transfer_method: pixKey ? 'PIX' : 'TED',
        supplier_will_receive: supplierNetAmount,
        platform_commission: platformCommission,
        status: 'transfer_pending',
        message: 'Transferência iniciada. Aguardando confirmação do Asaas.'
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