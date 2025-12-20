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

    // Get JWT from header - verify is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      throw new Error('Acesso não autorizado. Apenas administradores.');
    }

    // Get Asaas config (main account)
    const { apiKey, baseUrl } = await getAsaasConfig(supabaseClient);

    console.log('🔍 Fetching platform balance from Asaas...');

    // Fetch main account balance (no wallet param = main account)
    const response = await fetch(`${baseUrl}/finance/getCurrentBalance`, {
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
    console.log('✅ Platform balance fetched:', JSON.stringify(balanceData, null, 2));

    // Calculate totals from database
    const { data: inEscrowPayments } = await supabaseClient
      .from('payments')
      .select('amount, base_amount, supplier_net_amount, platform_commission_amount, asaas_fee')
      .eq('status', 'in_escrow');

    const { data: completedPayments } = await supabaseClient
      .from('payments')
      .select('amount, platform_commission_amount, transfer_date')
      .eq('status', 'completed')
      .gte('transfer_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    const { data: transferErrors } = await supabaseClient
      .from('payments')
      .select('id, amount, supplier_net_amount, transfer_error')
      .eq('status', 'in_escrow')
      .in('transfer_status', ['failed', 'error']);

    // Calculate metrics
    const totalInEscrow = inEscrowPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const supplierNetInEscrow = inEscrowPayments?.reduce((sum, p) => sum + (p.supplier_net_amount || 0), 0) || 0;
    const commissionInEscrow = inEscrowPayments?.reduce((sum, p) => sum + (p.platform_commission_amount || 0), 0) || 0;
    const feesInEscrow = inEscrowPayments?.reduce((sum, p) => sum + (p.asaas_fee || 0), 0) || 0;
    
    const transferredThisMonth = completedPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const commissionThisMonth = completedPayments?.reduce((sum, p) => sum + (p.platform_commission_amount || 0), 0) || 0;

    const pendingTransferAmount = transferErrors?.reduce((sum, p) => sum + (p.supplier_net_amount || 0), 0) || 0;

    // Log audit
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'PLATFORM_BALANCE_FETCHED',
        entity_type: 'system',
        entity_id: 'platform',
        panel_type: 'admin',
        details: {
          asaas_balance: balanceData.balance,
          total_in_escrow: totalInEscrow,
          timestamp: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        // Asaas account balance
        asaas: {
          balance: balanceData.balance ?? 0,
          totalBalance: balanceData.totalBalance ?? 0,
          availableForTransfer: balanceData.availableForTransfer ?? 0,
        },
        // Escrow metrics
        escrow: {
          total: totalInEscrow,
          supplierNet: supplierNetInEscrow,
          commission: commissionInEscrow,
          fees: feesInEscrow,
          count: inEscrowPayments?.length || 0
        },
        // Transfer metrics
        transfers: {
          completedThisMonth: transferredThisMonth,
          commissionThisMonth: commissionThisMonth,
          errorsCount: transferErrors?.length || 0,
          pendingErrorAmount: pendingTransferAmount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-platform-balance:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
