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

    // Buscar dados do pagamento
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        quotes!inner(id, title, client_id),
        suppliers!inner(id, name, email, asaas_wallet_id),
        clients!inner(id, name, email, cnpj, asaas_customer_id)
      `)
      .eq('id', paymentId)
      .eq('status', 'pending')
      .single()

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Pagamento não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obter configuração do Asaas (incluindo ambiente, URL e comissões)
    const { apiKey, baseUrl, config } = await getAsaasConfig(supabase);

    // Verificar/Criar customer no Asaas
    let asaasCustomerId = payment.clients.asaas_customer_id;

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

      console.log(`Customer Asaas criado: ${asaasCustomerId}`);
    } else {
      console.log(`Reutilizando customer Asaas existente: ${asaasCustomerId}`);
    }

    const commissionPercentage = config.platform_commission_percentage || 5.0
    const autoReleaseDays = config.auto_release_days || 7
    const splitEnabled = config.split_enabled !== false // Default true

    // Calcular split: plataforma fica com X%, fornecedor recebe (100-X)%
    const platformAmount = payment.amount * (commissionPercentage / 100)
    const supplierAmount = payment.amount - platformAmount

    // Criar cobrança no Asaas (com ou sem split)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1) // Vencimento amanhã

    // Determinar se deve incluir split
    const shouldIncludeSplit = splitEnabled && payment.suppliers.asaas_wallet_id

    const paymentBody: any = {
      customer: asaasCustomerId,
      billingType: 'UNDEFINED', // Cliente escolhe: PIX, Boleto ou Cartão
      value: payment.amount,
      dueDate: dueDate.toISOString().split('T')[0],
      description: `Pagamento da cotação ${payment.quote_id}`,
      externalReference: payment.id,
      postalService: false,
    }

    // Incluir split somente se habilitado e wallet válida
    if (shouldIncludeSplit) {
      paymentBody.split = [
        {
          walletId: payment.suppliers.asaas_wallet_id,
          fixedValue: supplierAmount,
          percentualValue: null,
        }
      ]
      console.log(`Split habilitado: R$ ${supplierAmount} para fornecedor (wallet: ${payment.suppliers.asaas_wallet_id})`)
    } else {
      console.log(`Split desabilitado ou wallet inválida - cobrança sem split`)
    }

    const asaasResponse = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      },
      body: JSON.stringify(paymentBody),
    })

    if (!asaasResponse.ok) {
      const error = await asaasResponse.json()
      console.error('Erro ao criar cobrança Asaas:', error)
      
      // Verificar se é erro de wallet inválida
      const isWalletError = error.errors?.some((e: any) => 
        e.code === 'invalid_action' && e.description?.includes('Wallet') && e.description?.includes('inexistente')
      )
      
      if (isWalletError) {
        const walletId = payment.suppliers.asaas_wallet_id
        const errorMessage = `Wallet Asaas do fornecedor inválida para o ambiente atual (${config.environment || 'sandbox'}). Atualize o asaas_wallet_id do fornecedor com um WalletId válido do Asaas ${config.environment === 'production' ? 'Produção' : 'Sandbox'}.`
        
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
            asaas_error: error.errors?.[0]?.description
          },
        })
        
        return new Response(
          JSON.stringify({ 
            error: errorMessage,
            details: {
              wallet_id: walletId,
              environment: config.environment || 'sandbox',
              suggestion: 'Desative split_enabled temporariamente ou atualize o wallet do fornecedor'
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

    // Atualizar pagamento com dados do Asaas
    await supabase
      .from('payments')
      .update({
        asaas_payment_id: asaasPayment.id,
        asaas_invoice_url: invoiceUrl,
        status: 'processing',
        escrow_release_date: new Date(Date.now() + autoReleaseDays * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
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
          amount: payment.amount,
          commission: platformAmount,
          supplier_amount: supplierAmount,
          split_enabled: shouldIncludeSplit,
          environment: config.environment || 'sandbox',
        },
      })

    const logMessage = shouldIncludeSplit 
      ? `Cobrança Asaas criada: ${asaasPayment.id} - Split: R$ ${supplierAmount} para fornecedor`
      : `Cobrança Asaas criada: ${asaasPayment.id} - SEM split (valor total na plataforma)`
    
    console.log(logMessage)

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
