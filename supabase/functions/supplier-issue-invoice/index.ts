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

    // 1.1. Buscar resposta aprovada do fornecedor para esta cotação
    const { data: quoteResponse, error: responseError } = await supabaseClient
      .from('quote_responses')
      .select('id, status, total_amount, shipping_cost, items')
      .eq('quote_id', quoteId)
      .in('status', ['approved', 'sent'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (responseError) {
      console.error('❌ Error fetching quote response:', responseError)
      throw new Error('Erro ao buscar resposta da cotação')
    }

    if (!quoteResponse) {
      throw new Error('Nenhuma resposta aprovada encontrada para esta cotação')
    }

    if (quoteResponse.status !== 'approved') {
      throw new Error('A resposta da cotação precisa estar aprovada pelo cliente para emitir cobrança')
    }

    if (!quote.supplier) {
      throw new Error('Fornecedor não encontrado para esta cotação')
    }

    // Buscar dados bancários do fornecedor para validação
    const { data: supplierBankData } = await supabaseClient
      .from('suppliers')
      .select('pix_key, bank_data')
      .eq('id', quote.supplier_id)
      .single()

    const hasPixKey = supplierBankData?.pix_key && supplierBankData.pix_key.trim() !== ''
    const hasBankData = supplierBankData?.bank_data && 
      supplierBankData.bank_data.account_number && 
      supplierBankData.bank_data.agency

    if (!hasPixKey && !hasBankData) {
      console.warn('⚠️ Fornecedor sem dados bancários configurados:', quote.supplier_id)
      // Não bloquear - permitir emissão, transferência será marcada para processamento manual
    }

    // Auto-criar cliente no Asaas se não existir
    let asaasCustomerId = quote.client.asaas_customer_id
    
    if (!asaasCustomerId) {
      console.log('📝 Cliente não possui cadastro no Asaas, criando automaticamente...')
      
      // Buscar dados completos do cliente
      const { data: clientData, error: clientError } = await supabaseClient
        .from('clients')
        .select('*')
        .eq('id', quote.client_id)
        .single()
      
      if (clientError || !clientData) {
        throw new Error('Erro ao buscar dados do cliente')
      }
      
      // Buscar configuração do Asaas
      const asaasConfigForCustomer = await getAsaasConfig(supabaseClient)
      
      // Preparar dados do cliente para o Asaas
      const customerPayload: Record<string, any> = {
        name: clientData.name,
        email: clientData.email,
        cpfCnpj: clientData.cnpj?.replace(/[^\d]/g, '') || '',
        phone: clientData.phone?.replace(/[^\d]/g, '') || undefined,
        externalReference: clientData.id,
        notificationDisabled: false
      }
      
      // Adicionar endereço se disponível
      if (clientData.address) {
        let addr: any = null
        
        // Verificar se é uma string JSON ou objeto
        if (typeof clientData.address === 'string') {
          // Tentar parse apenas se parecer ser JSON (começa com {)
          if (clientData.address.trim().startsWith('{')) {
            try {
              addr = JSON.parse(clientData.address)
            } catch (e) {
              console.log('📍 Endereço é string simples, usando diretamente')
              customerPayload.address = clientData.address
            }
          } else {
            // É uma string simples de endereço
            console.log('📍 Endereço é string simples:', clientData.address)
            customerPayload.address = clientData.address
          }
        } else {
          // É um objeto JSON
          addr = clientData.address
        }
        
        // Se conseguiu extrair objeto, usar campos individuais
        if (addr && typeof addr === 'object') {
          customerPayload.address = addr.street || addr.logradouro || undefined
          customerPayload.addressNumber = addr.number || addr.numero || undefined
          customerPayload.complement = addr.complement || addr.complemento || undefined
          customerPayload.province = addr.neighborhood || addr.bairro || undefined
          customerPayload.postalCode = addr.postal_code || addr.cep || addr.postalCode || undefined
        }
      }
      
      // Adicionar cidade e estado
      if (clientData.state) {
        customerPayload.state = clientData.state
      }
      
      console.log('📤 Creating Asaas customer:', customerPayload)
      
      const customerResponse = await fetch(`${asaasConfigForCustomer.baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': asaasConfigForCustomer.apiKey,
        },
        body: JSON.stringify(customerPayload)
      })
      
      if (!customerResponse.ok) {
        const errorText = await customerResponse.text()
        console.error('❌ Asaas customer creation error:', errorText)
        throw new Error(`Erro ao criar cliente no Asaas: ${errorText}`)
      }
      
      const asaasCustomer = await customerResponse.json()
      asaasCustomerId = asaasCustomer.id
      
      console.log('✅ Asaas customer created:', asaasCustomerId)
      
      // Atualizar cliente no banco com o ID do Asaas
      await supabaseClient
        .from('clients')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', quote.client_id)
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

    // 3. Calcular valores usando o total da resposta aprovada
    const baseAmount = quoteResponse.total_amount || 0
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
      customer: asaasCustomerId, // ID do cliente no Asaas (criado automaticamente se necessário)
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

    console.log('💾 Inserting payment with values:', {
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
      validation: `${calculation.baseAmount} - ${calculation.platformCommission} = ${calculation.baseAmount - calculation.platformCommission} (expected: ${calculation.supplierNet})`
    })

    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        // id é gerado automaticamente pelo trigger trg_payments_generate_friendly_id
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
