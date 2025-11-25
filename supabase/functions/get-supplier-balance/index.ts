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

    // 🔒 VALIDAÇÃO CRÍTICA: Verificar se wallet está configurado
    const walletId = supplier?.asaas_wallet_id;
    const isUUID = walletId ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(walletId) : true;
    
    if (!walletId || isUUID) {
      console.log('⚠️ Wallet não configurado ou UUID interno. Retornando zeros.', { walletId, isUUID });
      
      // Calcular valor em custódia mesmo sem wallet configurado
      const { data: escrowPayments } = await supabaseClient
        .from('payments')
        .select('supplier_net_amount, amount, base_amount')
        .eq('supplier_id', profile.supplier_id)
        .eq('status', 'in_escrow');

      const inEscrow = escrowPayments?.reduce((sum, p) => {
        const netAmount = p.supplier_net_amount || (p.base_amount || p.amount) * 0.95;
        return sum + netAmount;
      }, 0) || 0;

      // Log de auditoria
      await supabaseClient
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'ASAAS_BALANCE_NOT_CONFIGURED',
          entity_type: 'suppliers',
          entity_id: profile.supplier_id,
          panel_type: 'supplier',
          details: {
            wallet_id: walletId || 'not_set',
            is_uuid: isUUID,
            message: 'Subconta Asaas não configurada',
            timestamp: new Date().toISOString()
          }
        });

      return new Response(
        JSON.stringify({
          success: true,
          balance: 0,
          availableForTransfer: 0,
          inEscrow: inEscrow,
          totalProjected: inEscrow,
          totalBalance: 0,
          wallet_configured: false,
          message: 'Subconta Asaas não configurada. Configure para receber transferências.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter configuração do Asaas
    const { apiKey, baseUrl } = await getAsaasConfig(supabaseClient);

    console.log(`✅ Fetching balance for VALID wallet: ${walletId}`);

    // Buscar saldo na API do Asaas usando o wallet validado
    const response = await fetch(`${baseUrl}/finance/getCurrentBalance?wallet=${walletId}`, {
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
    const asaasAvailable = balanceData.availableForTransfer ?? balance;

    // 🔄 CORREÇÃO CRÍTICA: Calcular saldo em custódia baseado em pagamentos in_escrow
    console.log('🔍 Fetching escrow payments for supplier:', profile.supplier_id);
    
    const { data: escrowPayments, error: escrowError } = await supabaseClient
      .from('payments')
      .select('supplier_net_amount, amount, base_amount')
      .eq('supplier_id', profile.supplier_id)
      .eq('status', 'in_escrow');

    if (escrowError) {
      console.error('⚠️ Error fetching escrow payments:', escrowError);
    }

    // Calcular valor total EM CUSTÓDIA (aguardando confirmação de entrega)
    const inEscrow = escrowPayments?.reduce((sum, p) => {
      // Usar supplier_net_amount se disponível, senão calcular baseAmount * 0.95
      const netAmount = p.supplier_net_amount || (p.base_amount || p.amount) * 0.95;
      return sum + netAmount;
    }, 0) || 0;

    // ✅ DISPONÍVEL = Saldo REAL na subconta Asaas (o que pode sacar AGORA)
    const availableForTransfer = asaasAvailable;

    // Total projetado = disponível agora + em custódia
    const totalProjected = availableForTransfer + inEscrow;

    console.log('📊 Calculated balance values:', {
      totalBalance,
      balance,
      asaasAvailable,
      inEscrow,
      availableForTransfer,
      totalProjected,
      escrowPaymentsCount: escrowPayments?.length || 0,
      walletId: walletId,
      isValidWallet: !isUUID
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
        balance: balance,                          // Saldo total na subconta
        availableForTransfer: availableForTransfer, // O que pode sacar AGORA
        inEscrow: inEscrow,                        // Aguardando confirmação de entrega
        totalProjected: totalProjected,            // Projetado (disponível + custódia)
        totalBalance: totalBalance                 // Para compatibilidade
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
