import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

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

    // Get Asaas API key from system_settings
    const { data: apiKeyData, error: keyError } = await supabaseClient
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'asaas_api_key')
      .single();

    if (keyError || !apiKeyData?.setting_value?.encrypted_key) {
      throw new Error('Asaas API key not configured');
    }

    const asaasApiKey = apiKeyData.setting_value.encrypted_key;

    console.log('Testing Asaas connection...');

    // Test connection to Asaas API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch('https://api.asaas.com/v3/finance/getCurrentBalance', {
        method: 'GET',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Asaas API error:', responseData);
        throw new Error(responseData.errors?.[0]?.description || 'Failed to connect to Asaas API');
      }

      console.log('Asaas connection successful');

      // Log successful test
      await supabaseClient
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'ASAAS_CONNECTION_TESTED',
          entity_type: 'system_settings',
          entity_id: 'asaas_api_key',
          panel_type: 'admin',
          details: { 
            success: true,
            balance: responseData.balance,
            timestamp: new Date().toISOString()
          }
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Connection successful',
          balance: responseData.balance
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Connection timeout - Asaas API not responding');
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('Error in test-asaas-connection:', error);

    // Log failed test
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        
        if (user) {
          await supabaseClient
            .from('audit_logs')
            .insert({
              user_id: user.id,
              action: 'ASAAS_CONNECTION_TESTED',
              entity_type: 'system_settings',
              entity_id: 'asaas_api_key',
              panel_type: 'admin',
              details: { 
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
              }
            });
        }
      }
    } catch (logError) {
      console.error('Error logging failed test:', logError);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
