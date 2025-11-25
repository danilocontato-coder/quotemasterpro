import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { getAsaasConfig } from '../_shared/asaas-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AsaasSubaccountResponse {
  id: string;
  apiKey: string;
  walletId: string;
  name: string;
  email: string;
  cpfCnpj: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`🔍 Buscando fornecedor para usuário: ${user.id}`);

    // Buscar supplier_id do profile do usuário autenticado
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('supplier_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.supplier_id) {
      console.error('❌ Profile não encontrado ou sem supplier_id:', profileError);
      throw new Error('Usuário não está vinculado a um fornecedor');
    }

    const supplier_id = profile.supplier_id;
    console.log(`🚀 Criando subconta Asaas para fornecedor: ${supplier_id}`);

    // Buscar dados do fornecedor
    const { data: supplier, error: supplierError } = await supabaseClient
      .from('suppliers')
      .select('id, name, email, cnpj, phone, address, city, state, postal_code, asaas_wallet_id')
      .eq('id', supplier_id)
      .single();

    if (supplierError) {
      console.error('❌ Erro ao buscar fornecedor:', supplierError);
      console.error('❌ Detalhes do erro:', JSON.stringify(supplierError, null, 2));
    }

    if (supplierError || !supplier) {
      throw new Error(`Fornecedor não encontrado. supplier_id: ${supplier_id}, error: ${supplierError?.message || 'unknown'}`);
    }

    console.log('✅ Fornecedor encontrado:', supplier.name);

    // Verificar se já tem subconta configurada
    if (supplier.asaas_wallet_id && supplier.asaas_wallet_id.length > 36) {
      console.log('⚠️ Fornecedor já possui subconta Asaas configurada:', supplier.asaas_wallet_id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Fornecedor já possui subconta configurada',
          wallet_id: supplier.asaas_wallet_id,
          already_exists: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter configuração do Asaas
    const { apiKey, baseUrl } = await getAsaasConfig(supabaseClient);

    // Preparar dados para criação da subconta
    const subaccountData = {
      name: supplier.name,
      email: supplier.email,
      cpfCnpj: supplier.cnpj?.replace(/\D/g, ''),
      mobilePhone: supplier.phone?.replace(/\D/g, ''),
      address: supplier.address || '',
      addressNumber: '',
      province: supplier.city || '',
      postalCode: supplier.postal_code?.replace(/\D/g, '') || '',
      companyType: supplier.cnpj?.length === 14 ? 'MEI' : 'INDIVIDUAL',
      site: '',
    };

    console.log('📤 Enviando requisição para criar subconta no Asaas...');

    // Criar subconta no Asaas
    const response = await fetch(`${baseUrl}/accounts`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subaccountData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro na API do Asaas:', errorData);
      throw new Error(errorData.errors?.[0]?.description || 'Erro ao criar subconta no Asaas');
    }

    const asaasResponse: AsaasSubaccountResponse = await response.json();

    console.log('✅ Subconta criada com sucesso no Asaas:', {
      id: asaasResponse.id,
      walletId: asaasResponse.walletId,
      name: asaasResponse.name
    });

    // Atualizar fornecedor com o wallet_id real
    const { error: updateError } = await supabaseClient
      .from('suppliers')
      .update({
        asaas_wallet_id: asaasResponse.walletId,
        updated_at: new Date().toISOString()
      })
      .eq('id', supplier_id);

    if (updateError) {
      console.error('❌ Erro ao atualizar fornecedor:', updateError);
      throw new Error('Erro ao salvar wallet_id do fornecedor');
    }

    console.log('✅ Fornecedor atualizado com wallet_id real');

    // Log de auditoria
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'ASAAS_SUBACCOUNT_CREATED',
        entity_type: 'suppliers',
        entity_id: supplier_id,
        panel_type: 'supplier',
        details: {
          asaas_account_id: asaasResponse.id,
          asaas_wallet_id: asaasResponse.walletId,
          supplier_name: supplier.name,
          timestamp: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subconta Asaas criada com sucesso',
        wallet_id: asaasResponse.walletId,
        account_id: asaasResponse.id,
        already_exists: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro em create-asaas-subaccount:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: 'Verifique os logs para mais informações'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
