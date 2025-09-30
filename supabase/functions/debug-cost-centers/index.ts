import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      throw new Error(`Auth error: ${userError?.message}`);
    }

    console.log('✅ User authenticated:', user.id);

    // Get user's client_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.client_id) {
      throw new Error(`Profile error: ${profileError?.message || 'No client_id'}`);
    }

    console.log('✅ User client_id:', profile.client_id);

    // Check existing cost centers
    const { data: existingCenters, error: existingError } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('client_id', profile.client_id);

    console.log('📊 Existing cost centers:', existingCenters?.length || 0);
    if (existingCenters && existingCenters.length > 0) {
      console.log('Existing centers:', JSON.stringify(existingCenters, null, 2));
    }

    // Try to insert one test cost center directly
    console.log('🧪 Testing direct insert...');
    const { data: testInsert, error: testInsertError } = await supabase
      .from('cost_centers')
      .insert([{
        client_id: profile.client_id,
        name: 'TESTE DEBUG',
        code: 'DEBUG',
        description: 'Centro de custo de teste para debug',
        budget_monthly: 1000.00,
        budget_annual: 12000.00,
        active: true
      }])
      .select();

    if (testInsertError) {
      console.error('❌ Direct insert error:', testInsertError);
    } else {
      console.log('✅ Direct insert success:', testInsert);
    }

    // Check RLS policies
    console.log('🔒 Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('pg_policies')
      .eq('tablename', 'cost_centers');

    if (!policiesError && policies) {
      console.log('RLS Policies:', JSON.stringify(policies, null, 2));
    }

    // Try calling the RPC function
    console.log('🔧 Testing create_default_cost_centers RPC...');
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('create_default_cost_centers', {
        p_client_id: profile.client_id
      });

    if (rpcError) {
      console.error('❌ RPC error:', rpcError);
    } else {
      console.log('✅ RPC completed');
    }

    // Check cost centers after RPC
    const { data: afterRpc, error: afterRpcError } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('client_id', profile.client_id);

    console.log('📊 Cost centers after RPC:', afterRpc?.length || 0);

    // Check audit logs
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'cost_centers')
      .eq('action', 'DEFAULT_COST_CENTERS_CREATED')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('📝 Recent audit logs:', auditLogs?.length || 0);
    if (auditLogs && auditLogs.length > 0) {
      console.log('Audit logs:', JSON.stringify(auditLogs, null, 2));
    }

    return new Response(
      JSON.stringify({
        success: true,
        debug: {
          user_id: user.id,
          client_id: profile.client_id,
          existing_centers_count: existingCenters?.length || 0,
          existing_centers: existingCenters,
          test_insert: testInsert || 'failed',
          test_insert_error: testInsertError?.message,
          rpc_error: rpcError?.message,
          after_rpc_count: afterRpc?.length || 0,
          after_rpc_centers: afterRpc,
          audit_logs: auditLogs,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Debug function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
