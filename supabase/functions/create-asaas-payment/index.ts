import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAsaasConfig } from '../_shared/asaas-utils.ts'
import { calculateCustomerTotal } from '../_shared/asaas-fees.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { paymentId } = await req.json()
    console.log(`🔍 Buscando pagamento: ${paymentId}`)

    // Buscar dados do pagamento
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        quotes!inner(id, title, local_code, client_id),
        suppliers!inner(id, name, email, asaas_wallet_id),
        clients!inner(id, name, email, cnpj, asaas_customer_id)
      `)
      .eq('id', paymentId)
      .eq('status', 'pending')
      .single()

    console.log('📋 Resultado da busca:', { 
      found: !!payment, 
      error: paymentError?.message,
      payment_id: payment?.id,
      status: payment?.status 
    })

    if (payment) {
      console.log('🔍 Estrutura do payment:', {
        payment_id: payment.id,
        amount: payment.amount,
        quotes_structure: {
          id: payment.quotes?.id,
          local_code: payment.quotes?.local_code,
          title: payment.quotes?.title
        },
        supplier: {
          id: payment.suppliers?.id,
          name: payment.suppliers?.name,
          asaas_wallet_id: payment.suppliers?.asaas_wallet_id
        },
        client: {
          id: payment.clients?.id,
          name: payment.clients?.name,
          asaas_customer_id: payment.clients?.asaas_customer_id
        }
      })
    }

    if (paymentError || !payment) {
      console.error('❌ Erro ao buscar pagamento:', paymentError)
      
      // Tentar busca sem inner joins para debug
      const { data: debugPayment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .maybeSingle()
      
      console.log('🔍 Debug - Pagamento existe?', { 
        exists: !!debugPayment,
        status: debugPayment?.status,
        quote_id: debugPayment?.quote_id,
        supplier_id: debugPayment?.supplier_id,
        client_id: debugPayment?.client_id
      })
      
      return new Response(
        JSON.stringify({ 
          error: 'Pagamento não encontrado ou dados relacionados incompletos',
          details: paymentError?.message || 'Payment not found or not in pending status',
          paymentId,
          debug: {
            payment_exists: !!debugPayment,
            payment_status: debugPayment?.status,
            has_quote: !!debugPayment?.quote_id,
            has_supplier: !!debugPayment?.supplier_id,
            has_client: !!debugPayment?.client_id
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ FASE 2: Verificar se já possui cobrança Asaas criada (prevenir duplicação)
    if (payment.asaas_payment_id) {
      console.log('⚠️ Payment já possui asaas_payment_id:', payment.asaas_payment_id);
      
      // Obter configuração do Asaas para verificar cobrança existente
      const tempConfig = await getAsaasConfig(supabase);
      
      try {
        const checkResponse = await fetch(`${tempConfig.baseUrl}/payments/${payment.asaas_payment_id}`, {
          method: 'GET',
          headers: { 'access_token': tempConfig.apiKey }
        });
        
        if (checkResponse.ok) {
          const existingCharge = await checkResponse.json();
          console.log('✅ Cobrança já existe no Asaas, retornando dados existentes');
          
          return new Response(
            JSON.stringify({ 
              error: 'Cobrança já existe no Asaas',
              asaas_payment_id: payment.asaas_payment_id,
              invoice_url: existingCharge.invoiceUrl,
              bank_slip_url: existingCharge.bankSlipUrl,
              pix_code: existingCharge.pixCode,
              pix_qr_code: existingCharge.encodedImage
            }),
            { 
              status: 409, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        } else if (checkResponse.status === 404) {
          console.log('ℹ️ Cobrança foi deletada no Asaas, limpando ID e continuando...');
          // Cobrança foi deletada no Asaas, limpar ID e continuar
          await supabase
            .from('payments')
            .update({ asaas_payment_id: null })
            .eq('id', paymentId);
        }
      } catch (checkError) {
        console.error('Erro ao verificar cobrança existente:', checkError);
        // Se houver erro na verificação, continuar normalmente
      }
    }

    // ✅ Buscar resposta da cotação para validar valor correto (subtotal + frete)
    let totalAmount = payment.amount;
    
    if (payment.quote_id && payment.supplier_id) {
      const { data: quoteResponse } = await supabase
        .from('quote_responses')
        .select('items, shipping_cost, total_amount')
        .eq('quote_id', payment.quote_id)
        .eq('supplier_id', payment.supplier_id)
        .eq('status', 'approved')
        .maybeSingle();

      if (quoteResponse) {
        const subtotal = Array.isArray(quoteResponse.items)
          ? quoteResponse.items.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
          : 0;
        const shipping = quoteResponse.shipping_cost || 0;
        const calculatedTotal = subtotal + shipping;
        
        // Se payment.amount difere do valor correto, avisar e usar valor calculado
        if (Math.abs(payment.amount - calculatedTotal) > 0.01) {
          console.warn('⚠️ [ASAAS] Discrepância detectada! Valor do pagamento diferente da resposta aprovada:', {
            payment_amount: payment.amount,
            items_total: subtotal,
            shipping_cost: shipping,
            calculated_total: calculatedTotal,
            response_total_amount: quoteResponse.total_amount,
            difference: payment.amount - calculatedTotal
          });
          
          // Usar valor calculado (items + shipping) como fonte de verdade
          totalAmount = calculatedTotal;
        }
        
        console.log('💰 Valor final para Asaas:', {
          payment_amount_original: payment.amount,
          subtotal: subtotal,
          shipping: shipping,
          calculated_total: calculatedTotal,
          final_amount: totalAmount
        });
      }
    }

    // Obter configuração do Asaas (incluindo ambiente, URL e comissões)
    const { apiKey, baseUrl, config } = await getAsaasConfig(supabase);
    
    console.log('🔧 Asaas Config:', {
      split_enabled: config.split_enabled,
      platform_commission: config.platform_commission_percentage,
      environment: config.environment
    });

    // Verificar/Criar customer no Asaas
    let asaasCustomerId = payment.clients.asaas_customer_id;

    // Validar se customer existe no Asaas
    if (asaasCustomerId) {
      console.log(`🔍 Validando customer no Asaas: ${asaasCustomerId}`);
      
      const validateCustomerResponse = await fetch(`${baseUrl}/customers/${asaasCustomerId}`, {
        method: 'GET',
        headers: { 'access_token': apiKey }
      });
      
      if (!validateCustomerResponse.ok) {
        console.warn(`⚠️ Customer inválido detectado (${asaasCustomerId}), será recriado...`);
        asaasCustomerId = null; // Força recriação
      } else {
        console.log(`✅ Customer validado: ${asaasCustomerId}`);
      }
    }

    if (!asaasCustomerId) {
      console.log(`Criando customer Asaas para cliente: ${payment.clients.name}`);
      
      const createCustomerResponse = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': apiKey,
        },
        body: JSON.stringify({
          name: payment.clients.name,
          email: payment.clients.email,
          cpfCnpj: payment.clients.cnpj,
          externalReference: payment.client_id,
          notificationDisabled: false,
        }),
      });

      if (!createCustomerResponse.ok) {
        const error = await createCustomerResponse.json();
        console.error('Erro ao criar customer Asaas:', error);
        throw new Error(`Falha ao criar cliente no Asaas: ${error.errors?.[0]?.description || 'Erro desconhecido'}`);
      }

      const asaasCustomer = await createCustomerResponse.json();
      asaasCustomerId = asaasCustomer.id;

      // Salvar customer ID no banco
      await supabase
        .from('clients')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', payment.client_id);

      console.log(`✅ Customer Asaas criado: ${asaasCustomerId}`);
    }

    // ✅ NOVO: Calcular valores corretos (cliente paga base + taxa, fornecedor paga comissão)
    const baseAmount = totalAmount; // Valor da cotação (itens + frete)
    const calculation = calculateCustomerTotal(baseAmount, 'UNDEFINED'); // Cliente ainda não escolheu

    console.log('💰 Detalhamento de valores:', {
      valor_base_cotacao: calculation.baseAmount,
      taxa_asaas: calculation.asaasFee,
      total_cobrado_cliente: calculation.customerTotal,
      comissao_plataforma: calculation.platformCommission,
      liquido_fornecedor: calculation.supplierNet
    });

    // Criar cobrança no Asaas (com ou sem split)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1) // Vencimento amanhã

    // Validar dados bancários antes de tentar split
    const bankData = payment.suppliers.bank_data as any
    const hasBankData = bankData?.bank_code && 
                        bankData?.account_number && 
                        bankData?.account_holder_document && 
                        bankData?.agency

    // Determinar se deve incluir split (requer wallet E dados bancários)
    const shouldIncludeSplit = config.split_enabled && 
                              payment.suppliers.asaas_wallet_id && 
                              hasBankData

    // Log se split foi desabilitado por falta de dados bancários
    if (config.split_enabled && payment.suppliers.asaas_wallet_id && !hasBankData) {
      console.warn(`⚠️ Split desabilitado: Wallet existe mas dados bancários incompletos`)
      console.log('Campos faltantes:', {
        bank_code: !bankData?.bank_code,
        account_number: !bankData?.account_number,
        account_holder_document: !bankData?.account_holder_document,
        agency: !bankData?.agency
      })
      
      // Log de auditoria
      await supabase.from('audit_logs').insert({
        action: 'PAYMENT_SPLIT_SKIPPED',
        entity_type: 'payments',
        entity_id: paymentId,
        user_id: user.id,
        panel_type: 'admin',
        details: {
          reason: 'incomplete_bank_data',
          supplier_id: payment.supplier_id,
          supplier_name: payment.suppliers.name,
          wallet_id: payment.suppliers.asaas_wallet_id,
          missing_fields: [
            !bankData?.bank_code && 'bank_code',
            !bankData?.account_number && 'account_number',
            !bankData?.account_holder_document && 'account_holder_document',
            !bankData?.agency && 'agency'
          ].filter(Boolean)
        }
      })
    }

    // Garantir acesso robusto ao local_code
    const quoteCode = payment.quotes?.local_code || 'SEM-CÓDIGO'
    
    const paymentBody: any = {
      customer: asaasCustomerId,
      billingType: 'UNDEFINED', // Cliente escolhe: PIX, Boleto ou Cartão
      value: calculation.customerTotal, // ⬅️ VALOR COM TAXA ASAAS INCLUÍDA
      dueDate: dueDate.toISOString().split('T')[0],
      description: `Pagamento da cotação ${quoteCode}`,
      externalReference: payment.id,
      postalService: false,
    }

    // ============================================
    // FASE 1: VALIDAÇÃO PROATIVA DE WALLET (AUTO-HEAL)
    // ============================================
    let validatedWalletId = payment.suppliers.asaas_wallet_id;
    
    if (shouldIncludeSplit && validatedWalletId) {
      console.log(`🔍 Validando wallet antes de criar pagamento: ${validatedWalletId}`)
      
      // Validar se wallet existe no Asaas
      const validateWalletResponse = await fetch(`${baseUrl}/accounts/${validatedWalletId}`, {
        method: 'GET',
        headers: { 'access_token': apiKey }
      })
      
      if (!validateWalletResponse.ok) {
        console.warn(`⚠️ Wallet inválida detectada (${validatedWalletId}), tentando recriar...`)
        
        try {
          // Tentar recriar wallet via edge function
          const { data: newWallet, error: walletError } = await supabase.functions.invoke('create-asaas-wallet', {
            body: { supplierId: payment.supplier_id, force: true }
          })
          
          if (walletError) throw walletError
          
          if (newWallet?.wallet_id) {
            console.log(`✅ Nova wallet criada com sucesso: ${newWallet.wallet_id}`)
            validatedWalletId = newWallet.wallet_id
            
            // Atualizar supplier com nova wallet
            await supabase
              .from('suppliers')
              .update({ asaas_wallet_id: newWallet.wallet_id })
              .eq('id', payment.supplier_id)
            
            // Log de auditoria
            await supabase.from('audit_logs').insert({
              action: 'WALLET_AUTO_HEALED',
              entity_type: 'suppliers',
              entity_id: payment.supplier_id,
              user_id: user.id,
              panel_type: 'system',
              details: {
                old_wallet_id: payment.suppliers.asaas_wallet_id,
                new_wallet_id: newWallet.wallet_id,
                reason: 'invalid_wallet_detected_during_payment',
                payment_id: paymentId
              }
            })
          }
        } catch (healError) {
          console.error('❌ Falha ao recriar wallet:', healError)
          // Continuar sem split se não conseguir recriar
          validatedWalletId = null
        }
      } else {
        console.log(`✅ Wallet validada: ${validatedWalletId}`)
      }
    }

    // ⚠️ ESCROW FLOW: Split desabilitado - todo valor vai para conta principal
    // A transferência será feita manualmente via edge function após confirmação de entrega
    console.log(`💰 ESCROW: Pagamento sem split`)
    console.log(`📊 Cliente paga: R$ ${calculation.customerTotal}`)
    console.log(`📊 Base da cotação: R$ ${calculation.baseAmount}`)
    console.log(`📊 Taxa Asaas: R$ ${calculation.asaasFee}`)
    console.log(`📊 Comissão plataforma (5%): R$ ${calculation.platformCommission}`)
    console.log(`💸 Líquido fornecedor: R$ ${calculation.supplierNet} (será transferido após entrega)`)
    
    // Log de auditoria
    await supabase.from('audit_logs').insert({
      action: 'PAYMENT_CREATED_WITHOUT_SPLIT',
      entity_type: 'payments',
      entity_id: paymentId,
      user_id: user.id,
      panel_type: 'system',
      details: {
        reason: 'escrow_flow_enabled',
        supplier_id: payment.supplier_id,
        supplier_name: payment.suppliers.name,
        base_amount: calculation.baseAmount,
        asaas_fee: calculation.asaasFee,
        customer_total: calculation.customerTotal,
        platform_commission: calculation.platformCommission,
        supplier_net: calculation.supplierNet,
        wallet_id: payment.suppliers.asaas_wallet_id
      }
    })

    console.log('📤 Enviando para Asaas:', {
      value: paymentBody.value,
      description: paymentBody.description,
      dueDate: paymentBody.dueDate,
      customer: paymentBody.customer,
      billingType: paymentBody.billingType,
      hasSplit: !!paymentBody.split,
      walletId: paymentBody.split?.[0]?.walletId || null
    })

    let asaasResponse = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      },
      body: JSON.stringify(paymentBody),
    })

    // Se falhou com split, tentar novamente SEM split (fallback automático)
    if (!asaasResponse.ok && paymentBody.split) {
      const error = await asaasResponse.json()
      const isWalletError = error.errors?.some((e: any) => 
        e.code === 'invalid_action' && (
          e.description?.includes('Wallet') || 
          e.description?.includes('inexistente') ||
          e.description?.includes('inválida')
        )
      )
      
      if (isWalletError) {
        console.warn('⚠️ Wallet inválida detectada, tentando criar pagamento SEM split...')
        
        // Remover split e tentar novamente
        delete paymentBody.split
        asaasResponse = await fetch(`${baseUrl}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': apiKey,
          },
          body: JSON.stringify(paymentBody),
        })
        
        if (asaasResponse.ok) {
          console.log('✅ Pagamento criado sem split (fallback)')
          
          // Log de auditoria sobre o fallback
          await supabase.from('audit_logs').insert({
            action: 'ASAAS_PAYMENT_SPLIT_FALLBACK',
            entity_type: 'payments',
            entity_id: paymentId,
            user_id: user.id,
            details: {
              reason: 'wallet_invalid',
              wallet_id: payment.suppliers.asaas_wallet_id,
              supplier_id: payment.supplier_id,
              supplier_name: payment.suppliers.name,
              original_error: error.errors?.[0]?.description,
              action_taken: 'payment_created_without_split'
            },
          })
        }
      }
    }

    if (!asaasResponse.ok) {
      const error = await asaasResponse.json()
      console.error('❌ Erro ao criar cobrança Asaas:', error)
      
      // Verificar se é erro de wallet inválida
      const isWalletError = error.errors?.some((e: any) => 
        e.code === 'invalid_action' && (
          e.description?.includes('Wallet') || 
          e.description?.includes('inexistente') ||
          e.description?.includes('inválida')
        )
      )
      
      if (isWalletError) {
        const walletId = payment.suppliers.asaas_wallet_id
        const errorMessage = `Wallet Asaas do fornecedor inválida ou inativa. A wallet ${walletId} existe no banco, mas não está ativa/configurada no Asaas ${config.environment === 'production' ? 'Produção' : 'Sandbox'}. Possíveis causas: 1) Wallet pendente de ativação, 2) Dados bancários não configurados, 3) Wallet de outro ambiente (sandbox vs produção).`
        
        // Log de auditoria do erro
        await supabase.from('audit_logs').insert({
          action: 'ASAAS_PAYMENT_ERROR',
          entity_type: 'payments',
          entity_id: paymentId,
          user_id: user.id,
          details: {
            error_type: 'invalid_wallet',
            wallet_id: walletId,
            environment: config.environment || 'sandbox',
            supplier_id: payment.supplier_id,
            supplier_name: payment.suppliers.name,
            asaas_error: error.errors?.[0]?.description,
            suggestion: 'Verifique no painel Asaas se a wallet está ativa e com dados bancários configurados'
          },
        })
        
        return new Response(
          JSON.stringify({ 
            error: errorMessage,
            details: {
              wallet_id: walletId,
              environment: config.environment || 'sandbox',
              supplier: payment.suppliers.name,
              steps_to_fix: [
                '1. Acesse o painel Asaas Sandbox: https://sandbox.asaas.com/',
                `2. Localize a subconta/wallet: ${walletId}`,
                '3. Verifique se o status é ATIVO',
                '4. Configure dados bancários se necessário',
                '5. Ou desative "Split Automático" em /admin/integrations'
              ]
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      throw new Error(`Falha ao criar cobrança: ${error.errors?.[0]?.description || 'Erro desconhecido'}`)
    }

    const asaasPayment = await asaasResponse.json()

    // Determinar URL de pagamento com fallback inteligente
    const invoiceUrl = asaasPayment.invoiceUrl 
      || asaasPayment.bankSlipUrl 
      || `${baseUrl.replace('/api/v3', '')}/i/${asaasPayment.id}`
    
    console.log(`📋 Invoice URL gerada: ${invoiceUrl}`)

    // Atualizar pagamento com dados do Asaas e valores detalhados
    await supabase
      .from('payments')
      .update({
        asaas_payment_id: asaasPayment.id,
        asaas_invoice_url: invoiceUrl,
        asaas_due_date: asaasPayment.dueDate || null,
        status: 'processing',
        escrow_release_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
        updated_at: new Date().toISOString(),
        base_amount: calculation.baseAmount,
        asaas_fee: calculation.asaasFee,
        amount: calculation.customerTotal,
        platform_commission: calculation.platformCommission,
        supplier_net_amount: calculation.supplierNet,
        split_applied: false, // Sempre false no escrow
      })
      .eq('id', paymentId)

    // Log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        action: 'ASAAS_PAYMENT_CREATED',
        entity_type: 'payments',
        entity_id: paymentId,
        user_id: user.id,
        details: {
          asaas_payment_id: asaasPayment.id,
          base_amount: calculation.baseAmount,
          asaas_fee: calculation.asaasFee,
          customer_total: calculation.customerTotal,
          platform_commission: calculation.platformCommission,
          supplier_net: calculation.supplierNet,
          environment: config.environment || 'sandbox',
        },
      })

    console.log(`✅ Cobrança Asaas criada: ${asaasPayment.id} - Escrow (valor líquido R$ ${calculation.supplierNet} será transferido após entrega)`)

    return new Response(
      JSON.stringify({
        payment_id: asaasPayment.id,
        invoice_url: invoiceUrl,
        due_date: dueDate.toISOString(),
        message: 'Cobrança criada com sucesso',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating Asaas payment:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
