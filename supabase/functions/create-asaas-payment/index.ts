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

    // Verificar se fornecedor tem wallet
    if (!payment.suppliers.asaas_wallet_id) {
      return new Response(
        JSON.stringify({ error: 'Fornecedor precisa configurar wallet Asaas primeiro' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Calcular split: plataforma fica com X%, fornecedor recebe (100-X)%
    const platformAmount = payment.amount * (commissionPercentage / 100)
    const supplierAmount = payment.amount - platformAmount

    // Criar cobrança no Asaas com split
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1) // Vencimento amanhã

    const asaasResponse = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      },
      body: JSON.stringify({
        customer: asaasCustomerId, // ID do customer criado/existente
        billingType: 'UNDEFINED', // Cliente escolhe: PIX, Boleto ou Cartão
        value: payment.amount,
        dueDate: dueDate.toISOString().split('T')[0],
        description: `Pagamento da cotação ${payment.quote_id}`,
        externalReference: payment.id,
        postalService: false, // Não enviar pelos Correios (= escrow manual)
        split: [
          {
            walletId: payment.suppliers.asaas_wallet_id,
            fixedValue: supplierAmount,
            percentualValue: null,
          }
        ],
      }),
    })

    if (!asaasResponse.ok) {
      const error = await asaasResponse.json()
      console.error('Erro ao criar cobrança Asaas:', error)
      throw new Error(`Falha ao criar cobrança: ${error.errors?.[0]?.description || 'Erro desconhecido'}`)
    }

    const asaasPayment = await asaasResponse.json()

    // Atualizar pagamento com dados do Asaas
    await supabase
      .from('payments')
      .update({
        asaas_payment_id: asaasPayment.id,
        asaas_invoice_url: asaasPayment.invoiceUrl,
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
        },
      })

    console.log(`Cobrança Asaas criada: ${asaasPayment.id} - Split: R$ ${supplierAmount} para fornecedor`)

    return new Response(
      JSON.stringify({
        payment_id: asaasPayment.id,
        invoice_url: asaasPayment.invoiceUrl,
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
