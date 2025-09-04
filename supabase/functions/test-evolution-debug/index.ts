import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { resolveEvolutionConfig, normalizePhone, sendEvolutionWhatsApp } from '../_shared/evolution.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  console.log('Evolution debug test called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve Evolution config from SuperAdmin
    console.log('Resolving Evolution config...');
    const evo = await resolveEvolutionConfig(supabase, null); // null = global config
    
    console.log('Evolution config resolved:', {
      apiUrl: evo.apiUrl,
      instance: evo.instance,
      tokenLength: evo.token?.length || 0,
      scope: evo.scope
    });

    if (!evo.apiUrl || !evo.token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Evolution config not found',
          config: { apiUrl: !!evo.apiUrl, token: !!evo.token, instance: evo.instance }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test sending to a dummy number
    const testPhone = '5571999999999'; // Dummy test number
    const testMessage = 'Teste da API Evolution - QuoteMaster Pro';
    
    console.log('Testing Evolution API send...');
    const result = await sendEvolutionWhatsApp(evo, testPhone, testMessage);
    
    console.log('Evolution test result:', result);

    return new Response(
      JSON.stringify({ 
        success: true,
        config: {
          apiUrl: evo.apiUrl,
          instance: evo.instance,
          scope: evo.scope
        },
        test_result: result
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in Evolution debug test:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno',
        stack: error.stack
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);