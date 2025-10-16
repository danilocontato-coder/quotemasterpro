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

    // Obter configuração do Asaas (incluindo ambiente e URL)
    const { apiKey, baseUrl } = await getAsaasConfig(supabase);

    // Validar campos obrigatórios
    if (!supplier.email) {
      return new Response(
        JSON.stringify({ error: 'Email do fornecedor é obrigatório para criar wallet Asaas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!supplier.cnpj && !supplier.document_number) {
      return new Response(
        JSON.stringify({ error: 'CPF/CNPJ do fornecedor é obrigatório para criar wallet Asaas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Limpar e validar documento
    const cleanDocument = (supplier.cnpj || supplier.document_number).replace(/\D/g, '')
    if (cleanDocument.length !== 11 && cleanDocument.length !== 14) {
      return new Response(
        JSON.stringify({ error: 'CPF/CNPJ inválido. Deve ter 11 (CPF) ou 14 (CNPJ) dígitos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determinar companyType baseado no document_type
    let companyType: string
    
    if (supplier.document_type === 'cpf') {
      companyType = 'INDIVIDUAL' // Pessoa Física
    } else {
      // Para CNPJ, tentar extrair do business_info ou usar LIMITED como padrão
      const businessType = supplier.business_info?.company_type
      
      if (businessType === 'mei') {
        companyType = 'MEI'
      } else if (businessType === 'association') {
        companyType = 'ASSOCIATION'
      } else {
        companyType = 'LIMITED' // Padrão para empresas (Ltda, S/A, etc)
      }
    }

    // Calcular incomeValue (renda/faturamento) - obrigatório pela API Asaas
    const bi = supplier.business_info || {};
    const parseNum = (v: any) => {
      if (typeof v === 'number' && v > 0) return v;
      if (typeof v === 'string') {
        const cleaned = v.replace(/[^\d.]/g, '');
        const parsed = Number(cleaned);
        return parsed > 0 ? parsed : NaN;
      }
      return NaN;
    };

    let incomeValue = 
      parseNum(bi.incomeValue) ||
      parseNum(bi.monthly_revenue) ||
      parseNum(bi.faturamento_mensal);

    let usedFallback = false;

    // Se não há valor válido, aplicar fallback conservador (sandbox)
    if (!incomeValue || isNaN(incomeValue) || incomeValue <= 0) {
      // Tentar mapear faixas como "1k-5k"
      const range = typeof bi.revenue_range === 'string' ? bi.revenue_range : '';
      if (range.includes('1k') && range.includes('5k')) {
        incomeValue = 3000;
      } else if (range.includes('5k') && range.includes('10k')) {
        incomeValue = 7500;
      } else if (range.includes('10k') && range.includes('50k')) {
        incomeValue = 30000;
      } else {
        // Fallback final por tipo de documento
        incomeValue = supplier.document_type === 'cpf' ? 5000 : 10000;
        usedFallback = true;
      }
    }

    console.log('📝 Criando wallet Asaas para fornecedor:', {
      supplierName: supplier.name,
      supplierId: supplierId,
      documentType: supplier.document_type,
      document: cleanDocument,
      companyType: companyType,
      email: supplier.email,
      incomeValue: incomeValue,
      incomeValueSource: usedFallback ? 'fallback' : (bi.faturamento_mensal ? 'faturamento_mensal' : 'business_info'),
      hasPhone: !!(supplier.phone || supplier.whatsapp),
      hasAddress: !!supplier.address
    });

    const bankData = supplier.bank_data || {}
    
    // Criar subconta no Asaas
    const asaasResponse = await fetch(`${baseUrl}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      },
      body: JSON.stringify({
        name: supplier.name,
        email: supplier.email,
        cpfCnpj: cleanDocument,
        companyType: companyType,
        incomeValue: Number(incomeValue),
        mobilePhone: supplier.phone || supplier.whatsapp,
        address: supplier.address?.street,
        addressNumber: supplier.address?.number,
        complement: supplier.address?.complement,
        province: supplier.address?.neighborhood,
        postalCode: supplier.address?.postal_code,
        accountType: 'SUPPLIER',
      }),
    })

    if (!asaasResponse.ok) {
      const error = await asaasResponse.json()
      console.error('❌ Erro Asaas ao criar wallet:', {
        status: asaasResponse.status,
        error: error
      })
      
      // Extrair mensagem específica
      const errorMessage = error.errors?.[0]?.description || 'Erro desconhecido'
      const errorCode = error.errors?.[0]?.code || 'unknown'
      
      throw new Error(`Falha ao criar wallet Asaas: ${errorMessage} (${errorCode})`)
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
          income_value: incomeValue,
          income_value_used_fallback: usedFallback,
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
