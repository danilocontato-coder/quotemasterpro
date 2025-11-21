import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { getAsaasConfig } from '../_shared/asaas-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get JWT from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Buscar fornecedor do usuário
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('supplier_id')
      .eq('id', user.id)
      .single();

    if (!profile?.supplier_id) {
      throw new Error('Fornecedor não encontrado');
    }

    // Buscar wallet do fornecedor
    const { data: supplier } = await supabaseClient
      .from('suppliers')
      .select('asaas_wallet_id')
      .eq('id', profile.supplier_id)
      .single();

    if (!supplier?.asaas_wallet_id) {
      throw new Error('Wallet Asaas não configurada para este fornecedor');
    }

    // Obter configuração do Asaas
    const { apiKey, baseUrl } = await getAsaasConfig(supabaseClient);

    console.log(`Fetching balance for wallet: ${supplier.asaas_wallet_id}`);

    // Buscar saldo na API do Asaas
    const response = await fetch(`${baseUrl}/finance/getCurrentBalance?wallet=${supplier.asaas_wallet_id}`, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Asaas API error:', errorData);
      throw new Error(errorData.errors?.[0]?.description || 'Erro ao buscar saldo no Asaas');
    }

    const balanceData = await response.json();

    console.log('✅ Balance fetched successfully:', JSON.stringify(balanceData, null, 2));

    // A API do Asaas pode retornar campos diferentes dependendo da versão
    // Mapear todos os campos possíveis com fallback correto
    const totalBalance = balanceData.totalBalance ?? 0;
    const balance = balanceData.balance ?? totalBalance;
    const availableForTransfer = balanceData.availableForTransfer ?? balance;
    const blockedBalance = balanceData.blockedBalance ?? 0;

    console.log('📊 Mapped balance values:', {
      totalBalance,
      balance,
      availableForTransfer,
      blockedBalance
    });

    // Log de auditoria
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'ASAAS_BALANCE_FETCHED',
        entity_type: 'suppliers',
        entity_id: profile.supplier_id,
        panel_type: 'supplier',
        details: {
          wallet_id: supplier.asaas_wallet_id,
          raw_response: balanceData,
          balance: balance,
          timestamp: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        balance: balance,
        availableForTransfer: availableForTransfer,
        blockedBalance: blockedBalance,
        totalBalance: totalBalance
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-supplier-balance:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
