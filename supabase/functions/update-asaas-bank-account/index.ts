import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAsaasConfig } from '../_shared/asaas-utils.ts'
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

    const { supplierId, bank_data } = await req.json()
    
    if (!supplierId || !bank_data) {
      return new Response(
        JSON.stringify({ error: 'supplierId e bank_data são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🏦 Atualizando dados bancários do fornecedor: ${supplierId}`)

    // Buscar fornecedor e validar asaas_wallet_id
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, name, email, document_number, asaas_wallet_id')
      .eq('id', supplierId)
      .single()

    if (supplierError || !supplier) {
      return new Response(
        JSON.stringify({ error: 'Fornecedor não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!supplier.asaas_wallet_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Fornecedor não possui wallet no Asaas. Crie a wallet primeiro.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar campos obrigatórios
    if (!bank_data.bank_code || !bank_data.account_number || !bank_data.account_holder_name || 
        !bank_data.account_holder_document || !bank_data.agency) {
      return new Response(
        JSON.stringify({ 
          error: 'Dados bancários incompletos. Campos obrigatórios: bank_code, account_number, account_holder_name, account_holder_document, agency' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar configuração do Asaas
    const asaasConfig = await getAsaasConfig(supabase)
    
    // Formatar payload para API Asaas
    const bankAccountPayload = {
      bank: {
        code: bank_data.bank_code
      },
      accountName: supplier.name,
      ownerName: bank_data.account_holder_name,
      cpfCnpj: bank_data.account_holder_document.replace(/\D/g, ''),
      agency: bank_data.agency,
      agencyDigit: bank_data.agency_digit || '',
      account: bank_data.account_number,
      accountDigit: bank_data.account_digit || ''
    }

    console.log('📤 Enviando dados bancários para Asaas:', {
      wallet_id: supplier.asaas_wallet_id,
      bank_code: bankAccountPayload.bank.code,
      account: bankAccountPayload.account
    })

    // Chamar API Asaas para atualizar dados bancários (endpoint correto para subaccounts)
    const asaasResponse = await fetch(
      `${asaasConfig.baseUrl}/subaccounts/${supplier.asaas_wallet_id}/bankAccount`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': asaasConfig.apiKey
        },
        body: JSON.stringify(bankAccountPayload)
      }
    )

    // Verificar se a resposta é HTML (erro de autenticação/endpoint)
    const contentType = asaasResponse.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await asaasResponse.text()
      console.error('❌ API Asaas retornou HTML ao invés de JSON:', textResponse.substring(0, 200))
      return new Response(
        JSON.stringify({ 
          error: 'Erro de comunicação com Asaas',
          details: 'A API retornou um formato inválido. Verifique as credenciais e o ambiente (sandbox/production).'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const asaasData = await asaasResponse.json()

    if (!asaasResponse.ok) {
      console.error('❌ Erro da API Asaas:', asaasData)
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao atualizar dados bancários no Asaas',
          details: asaasData.errors || asaasData.message
        }),
        { status: asaasResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Dados bancários atualizados no Asaas:', asaasData)

    // Atualizar bank_data no Supabase
    const updatedBankData = {
      ...bank_data,
      verified: true,
      verified_at: new Date().toISOString(),
      asaas_bank_account_id: asaasData.id
    }

    const { error: updateError } = await supabase
      .from('suppliers')
      .update({ 
        bank_data: updatedBankData,
        updated_at: new Date().toISOString()
      })
      .eq('id', supplierId)

    if (updateError) {
      console.error('❌ Erro ao atualizar bank_data no Supabase:', updateError)
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar dados bancários' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Registrar audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'SUPPLIER_BANK_DATA_UPDATED',
      entity_type: 'suppliers',
      entity_id: supplierId,
      panel_type: 'admin',
      details: {
        wallet_id: supplier.asaas_wallet_id,
        bank_code: bank_data.bank_code,
        bank_name: bank_data.bank_name,
        asaas_bank_account_id: asaasData.id
      }
    })

    console.log('✅ Dados bancários atualizados com sucesso!')

    return new Response(
      JSON.stringify({ 
        success: true,
        wallet_id: supplier.asaas_wallet_id,
        bank_account_id: asaasData.id,
        message: 'Dados bancários configurados com sucesso'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('💥 Erro ao atualizar dados bancários:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno ao processar solicitação',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
