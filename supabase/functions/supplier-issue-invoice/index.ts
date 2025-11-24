import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getAsaasConfig } from '../_shared/asaas-utils.ts'
import { calculateCustomerTotal } from '../_shared/asaas-fees.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { quoteId, invoiceNumber, dueDate, notes, nfeUrl } = await req.json()

    console.log(`📄 Supplier issuing invoice for quote ${quoteId}`)

    // 1. Buscar cotação e validar
    const { data: quote, error: quoteError } = await supabaseClient
      .from('quotes')
      .select(`
        *,
        supplier:supplier_id(id, name, asaas_wallet_id),
        client:client_id(id, name, email, asaas_customer_id)
      `)
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      throw new Error('Cotação não encontrada')
    }

    if (quote.status !== 'approved') {
      throw new Error('Cotação precisa estar aprovada para emitir cobrança')
    }

    if (!quote.supplier || !quote.supplier.asaas_wallet_id) {
      throw new Error('Fornecedor não possui wallet do Asaas configurado')
    }

    if (!quote.client.asaas_customer_id) {
      throw new Error('Cliente não possui cadastro no Asaas. Entre em contato com o suporte.')
    }

    // 2. Verificar se já existe pagamento para esta cotação
    const { data: existingPayment } = await supabaseClient
      .from('payments')
      .select('id')
      .eq('quote_id', quoteId)
      .single()

    if (existingPayment) {
      throw new Error('Já existe uma cobrança para esta cotação')
    }

    // 3. Calcular valores
    const baseAmount = quote.total || 0
    const calculation = calculateCustomerTotal(baseAmount, 'UNDEFINED')
    
    console.log(`💰 Calculation:`, calculation)

    // 🛡️ Validação de sanidade
    if (calculation.supplierNet > calculation.baseAmount) {
      console.error('❌ ERRO CRÍTICO: supplierNet maior que baseAmount!', {
        baseAmount: calculation.baseAmount,
        supplierNet: calculation.supplierNet,
        platformCommission: calculation.platformCommission,
        asaasFee: calculation.asaasFee,
        quoteId: quote.id
      });
      throw new Error('Erro no cálculo financeiro: valor líquido não pode ser maior que valor base');
    }

    if (calculation.supplierNet < 0) {
      console.warn('⚠️ Valor líquido negativo detectado', {
        baseAmount: calculation.baseAmount,
        supplierNet: calculation.supplierNet,
        quoteId: quote.id
      });
    }

    console.log('✅ Cálculo financeiro validado:', calculation)

    // 4. Buscar configuração do Asaas
    const asaasConfig = await getAsaasConfig(supabaseClient)

    // 5. Criar cobrança no Asaas
    const asaasPayload = {
      customer: quote.client.asaas_customer_id, // ID do cliente no Asaas
      billingType: 'UNDEFINED', // Cliente escolhe ao pagar
      value: calculation.customerTotal,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: `Cotação #${quote.local_code || quoteId} - ${quote.title}`,
      externalReference: quoteId,
      postalService: false,
      split: []
    }

    console.log(`🔧 Creating Asaas payment with:`, asaasPayload)

    const asaasResponse = await fetch(`${asaasConfig.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasConfig.apiKey,
      },
      body: JSON.stringify(asaasPayload)
    })

    if (!asaasResponse.ok) {
      const errorText = await asaasResponse.text()
      console.error('❌ Asaas API error:', errorText)
      throw new Error(`Erro ao criar cobrança no Asaas: ${errorText}`)
    }

    const asaasPayment = await asaasResponse.json()
    console.log(`✅ Asaas payment created:`, asaasPayment.id)

    // 6. Criar registro de payment no banco
    // Preparar notas offline (combinando notes + nfeUrl se fornecido)
    let offlineNotes = notes || '';
    if (nfeUrl) {
      offlineNotes += (offlineNotes ? '\n\n' : '') + `NF-e: ${nfeUrl}`;
    }

    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        id: `PAY${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`,
        quote_id: quoteId,
        client_id: quote.client_id,
        supplier_id: quote.supplier_id,
        amount: calculation.customerTotal,
        base_amount: calculation.baseAmount,
        asaas_fee: calculation.asaasFee,
        asaas_payment_fee: calculation.asaasPaymentFee,
        asaas_messaging_fee: calculation.asaasMessagingFee,
        platform_commission: calculation.platformCommission,
        supplier_net_amount: calculation.supplierNet,
        status: 'pending',
        asaas_payment_id: asaasPayment.id,
        asaas_invoice_url: asaasPayment.invoiceUrl || null,
        issued_by: quote.supplier_id,
        invoice_number: invoiceNumber,
        invoice_issued_at: new Date().toISOString(),
        offline_notes: offlineNotes || null,
        offline_attachments: nfeUrl ? [nfeUrl] : null
      })
      .select()
      .single()

    if (paymentError) {
      console.error('❌ Error creating payment:', paymentError)
      throw new Error('Erro ao criar registro de pagamento')
    }

    // 7. Atualizar status da cotação
    await supabaseClient
      .from('quotes')
      .update({ 
        status: 'awaiting_payment',
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)

    // 8. Criar notificação para o cliente
    await supabaseClient.rpc('notify_client_users', {
      p_client_id: quote.client_id,
      p_title: 'Nova Cobrança Recebida',
      p_message: `Você recebeu uma cobrança de ${quote.supplier.name} no valor de R$ ${calculation.customerTotal.toFixed(2)}`,
      p_type: 'payment',
      p_priority: 'high',
      p_action_url: '/payments',
      p_metadata: {
        payment_id: payment.id,
        quote_id: quoteId,
        supplier_name: quote.supplier.name,
        amount: calculation.customerTotal
      }
    })

    // 9. Log de auditoria
    await supabaseClient
      .from('audit_logs')
      .insert({
        action: 'INVOICE_ISSUED_BY_SUPPLIER',
        entity_type: 'payments',
        entity_id: payment.id,
        panel_type: 'supplier',
        details: {
          quote_id: quoteId,
          supplier_id: quote.supplier_id,
          client_id: quote.client_id,
          amount: calculation.customerTotal,
          asaas_payment_id: asaasPayment.id,
          invoice_number: invoiceNumber
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        asaas_payment_id: asaasPayment.id,
        invoice_url: asaasPayment.invoiceUrl,
        bank_slip_url: asaasPayment.bankSlipUrl,
        pix_qr_code: asaasPayment.pixQrCodeId,
        amount: calculation.customerTotal,
        message: 'Cobrança emitida com sucesso!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in supplier-issue-invoice:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as any)?.message || 'Erro ao emitir cobrança'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
