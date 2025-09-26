import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { resolveEvolutionConfig, normalizePhone, sendEvolutionWhatsApp } from '../_shared/evolution.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test Evolution config resolution
    const evoConfig = await resolveEvolutionConfig(supabase, null, true); // preferGlobal = true

    if (!evoConfig.apiUrl || !evoConfig.token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Evolution API not configured',
          config: {
            hasApiUrl: Boolean(evoConfig.apiUrl),
            hasToken: Boolean(evoConfig.token),
            instance: evoConfig.instance,
            scope: evoConfig.scope
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Test sending a message
    const testNumber = normalizePhone('5571999887766'); // Test number
    const testMessage = `🤖 Teste de configuração Evolution API\n\nInstância: ${evoConfig.instance}\nHora: ${new Date().toLocaleString('pt-BR')}\n\nConfiguração funcionando corretamente! ✅`;

    const result = await sendEvolutionWhatsApp(evoConfig, testNumber, testMessage);

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success ? 'Teste Evolution executado com sucesso!' : 'Falha no teste Evolution',
        config: {
          apiUrl: evoConfig.apiUrl,
          instance: evoConfig.instance,
          scope: evoConfig.scope,
          hasToken: Boolean(evoConfig.token)
        },
        testResult: result,
        testNumber,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in test-evolution-debug:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        stack: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
};

serve(handler);