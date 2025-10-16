import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const { supplierId } = await req.json()

    // Buscar dados do fornecedor
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single()

    if (supplierError || !supplier) {
      return new Response(
        JSON.stringify({ error: 'Fornecedor não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se já tem wallet
    if (supplier.asaas_wallet_id) {
      return new Response(
        JSON.stringify({ wallet_id: supplier.asaas_wallet_id, message: 'Wallet já existe' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')
    if (!asaasApiKey) {
      throw new Error('ASAAS_API_KEY não configurada')
    }

    const bankData = supplier.bank_data || {}
    
    // Criar subconta no Asaas
    const asaasResponse = await fetch('https://api.asaas.com/v3/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify({
        name: supplier.name,
        email: supplier.email,
        cpfCnpj: supplier.cnpj?.replace(/\D/g, '') || supplier.document_number?.replace(/\D/g, ''),
        mobilePhone: supplier.phone || supplier.whatsapp,
        address: supplier.address?.street,
        addressNumber: supplier.address?.number,
        complement: supplier.address?.complement,
        province: supplier.address?.neighborhood,
        postalCode: supplier.address?.postal_code,
        accountType: 'SUPPLIER', // Subconta de fornecedor
      }),
    })

    if (!asaasResponse.ok) {
      const error = await asaasResponse.json()
      console.error('Erro ao criar wallet Asaas:', error)
      throw new Error(`Falha ao criar wallet: ${error.errors?.[0]?.description || 'Erro desconhecido'}`)
    }

    const wallet = await asaasResponse.json()

    // Atualizar fornecedor com wallet_id
    await supabase
      .from('suppliers')
      .update({ 
        asaas_wallet_id: wallet.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', supplierId)

    // Log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        action: 'ASAAS_WALLET_CREATED',
        entity_type: 'suppliers',
        entity_id: supplierId,
        user_id: user.id,
        details: {
          wallet_id: wallet.id,
          supplier_name: supplier.name,
        },
      })

    console.log(`Wallet Asaas criada para fornecedor ${supplier.name}: ${wallet.id}`)

    return new Response(
      JSON.stringify({
        wallet_id: wallet.id,
        message: 'Wallet criada com sucesso',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating Asaas wallet:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
