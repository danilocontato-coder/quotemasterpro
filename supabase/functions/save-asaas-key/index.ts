import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { corsHeaders } from '../_shared/cors.ts';
import { validateUserAuth } from '../_shared/auth-helper.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate authentication
    const user = await validateUserAuth(req, supabaseClient);

    // Check if user is admin
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error checking roles:', rolesError);
      throw new Error('Error checking user permissions');
    }

    const isAdmin = roles?.some(r => r.role === 'admin' || r.role === 'super_admin');
    if (!isAdmin) {
      throw new Error('Only admins can save Asaas API key');
    }

    const { apiKey } = await req.json();

    if (!apiKey || apiKey.length < 20) {
      throw new Error('Invalid API key format');
    }

    // Save API key to system_settings
    const { error: updateError } = await supabaseClient
      .from('system_settings')
      .upsert({
        setting_key: 'asaas_api_key',
        setting_value: { encrypted_key: apiKey },
        description: 'Asaas API Key (encrypted)',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      });

    if (updateError) {
      console.error('Error saving API key:', updateError);
      throw new Error('Failed to save API key');
    }

    // Update asaas_config to mark as configured
    const { data: existingConfig } = await supabaseClient
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'asaas_config')
      .single();

    const currentConfig = existingConfig?.setting_value || {};
    
    await supabaseClient
      .from('system_settings')
      .upsert({
        setting_key: 'asaas_config',
        setting_value: {
          ...currentConfig,
          api_key_configured: true
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      });

    // Log audit
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'ASAAS_API_KEY_SAVED',
        entity_type: 'system_settings',
        entity_id: 'asaas_api_key',
        panel_type: 'admin',
        details: { timestamp: new Date().toISOString() }
      });

    console.log('Asaas API key saved successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'API key saved successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-asaas-key:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
