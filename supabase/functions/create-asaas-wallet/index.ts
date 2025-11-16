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

    const { supplierId, force = false } = await req.json()

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
      // Se force não está habilitado, validar se a wallet existe no Asaas
      if (!force) {
        console.log('🔍 Validando wallet existente no Asaas:', supplier.asaas_wallet_id);
        
        // Obter configuração do Asaas
        const { apiKey, baseUrl } = await getAsaasConfig(supabase);
        
        // Tentar buscar conta por CPF/CNPJ para validar
        const cleanDocument = (supplier.cnpj || supplier.document_number).replace(/\D/g, '');
        const searchResponse = await fetch(`${baseUrl}/accounts?cpfCnpj=${cleanDocument}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'access_token': apiKey,
          },
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const accounts = searchData.data || [];
          const existingAccount = accounts.find((acc: any) => acc.id === supplier.asaas_wallet_id);
          
          if (existingAccount) {
            console.log('✅ Wallet válida no Asaas');
            return new Response(
              JSON.stringify({ wallet_id: supplier.asaas_wallet_id, message: 'Wallet já existe e é válida' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        
        // Wallet não encontrada no Asaas
        console.warn('⚠️ Wallet cadastrada no banco mas não existe no Asaas');
        return new Response(
          JSON.stringify({ 
            code: 'WALLET_INVALID_NEEDS_FORCE',
            wallet_id: supplier.asaas_wallet_id,
            message: 'Wallet cadastrada no banco, mas não existe no Asaas. Use force=true para recriar.'
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Se force=true, continuar para recriar/validar a wallet
      console.log('🔄 Forçando recriação/validação da wallet');
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

    console.log('📝 Criando/validando wallet Asaas para fornecedor:', {
      supplierName: supplier.name,
      supplierId: supplierId,
      documentType: supplier.document_type,
      document: cleanDocument,
      companyType: companyType,
      email: supplier.email,
      incomeValue: incomeValue,
      incomeValueSource: usedFallback ? 'fallback' : (bi.faturamento_mensal ? 'faturamento_mensal' : 'business_info'),
      hasPhone: !!(supplier.phone || supplier.whatsapp),
      hasAddress: !!supplier.address,
      forceMode: force
    });

    const bankData = supplier.bank_data || {}
    let walletId = supplier.asaas_wallet_id;
    let walletSource: 'existing' | 'found_by_cpfCnpj' | 'created_new' = 'existing';
    
    // Se force=true e já existe wallet, primeiro buscar no Asaas por CPF/CNPJ
    if (force && supplier.asaas_wallet_id) {
      console.log('🔍 Buscando conta existente no Asaas por CPF/CNPJ...');
      const searchResponse = await fetch(`${baseUrl}/accounts?cpfCnpj=${cleanDocument}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'access_token': apiKey,
        },
      });
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const accounts = searchData.data || [];
        
        if (accounts.length > 0) {
          // Usar a primeira conta encontrada
          walletId = accounts[0].id;
          walletSource = 'found_by_cpfCnpj';
          console.log('✅ Conta encontrada no Asaas:', walletId);
          
          // Atualizar no banco
          await supabase
            .from('suppliers')
            .update({ 
              asaas_wallet_id: walletId,
              updated_at: new Date().toISOString()
            })
            .eq('id', supplierId);
          
          // Log de auditoria
          await supabase
            .from('audit_logs')
            .insert({
              action: 'ASAAS_WALLET_VALIDATED',
              entity_type: 'suppliers',
              entity_id: supplierId,
              user_id: user.id,
              details: {
                wallet_id: walletId,
                previous_wallet_id: supplier.asaas_wallet_id,
                supplier_name: supplier.name,
                source: walletSource,
              },
            });
          
          return new Response(
            JSON.stringify({
              wallet_id: walletId,
              message: 'Wallet existente no Asaas foi vinculada com sucesso',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    // Criar subconta no Asaas (se não encontrou ou não existe)
    if (!force || walletSource === 'existing') {
      console.log('🆕 Criando nova subconta no Asaas...');
    }
    
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
      
      // Se CPF/CNPJ já existe, buscar a conta existente
      if (errorCode === 'invalid_action' && errorMessage.includes('já')) {
        console.log('📋 CPF/CNPJ já cadastrado, buscando conta existente...');
        const searchResponse = await fetch(`${baseUrl}/accounts?cpfCnpj=${cleanDocument}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'access_token': apiKey,
          },
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const accounts = searchData.data || [];
          
          if (accounts.length > 0) {
            walletId = accounts[0].id;
            walletSource = 'found_by_cpfCnpj';
            console.log('✅ Conta existente encontrada:', walletId);
            
            // Atualizar no banco
            await supabase
              .from('suppliers')
              .update({ 
                asaas_wallet_id: walletId,
                updated_at: new Date().toISOString()
              })
              .eq('id', supplierId);
            
            // Log de auditoria
            await supabase
              .from('audit_logs')
              .insert({
                action: 'ASAAS_WALLET_RECREATED',
                entity_type: 'suppliers',
                entity_id: supplierId,
                user_id: user.id,
                details: {
                  wallet_id: walletId,
                  previous_wallet_id: supplier.asaas_wallet_id,
                  supplier_name: supplier.name,
                  source: walletSource,
                },
              });
            
            return new Response(
              JSON.stringify({
                wallet_id: walletId,
                message: 'Wallet existente vinculada com sucesso',
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
      
      throw new Error(`Falha ao criar wallet Asaas: ${errorMessage} (${errorCode})`)
    }

    const wallet = await asaasResponse.json()
    walletId = wallet.id
    walletSource = 'created_new'

    // Atualizar fornecedor com wallet_id
    await supabase
      .from('suppliers')
      .update({ 
        asaas_wallet_id: wallet.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', supplierId)

    // Log de auditoria
    const auditAction = force && supplier.asaas_wallet_id ? 'ASAAS_WALLET_RECREATED' : 'ASAAS_WALLET_CREATED';
    await supabase
      .from('audit_logs')
      .insert({
        action: auditAction,
        entity_type: 'suppliers',
        entity_id: supplierId,
        user_id: user.id,
        details: {
          wallet_id: walletId,
          previous_wallet_id: supplier.asaas_wallet_id,
          supplier_name: supplier.name,
          income_value: incomeValue,
          income_value_used_fallback: usedFallback,
          source: walletSource,
          force_mode: force,
        },
      })

    console.log(`✅ Wallet Asaas ${auditAction === 'ASAAS_WALLET_RECREATED' ? 'recriada' : 'criada'} para fornecedor ${supplier.name}: ${walletId}`)

    return new Response(
      JSON.stringify({
        wallet_id: walletId,
        message: auditAction === 'ASAAS_WALLET_RECREATED' ? 'Wallet recriada com sucesso' : 'Wallet criada com sucesso',
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
