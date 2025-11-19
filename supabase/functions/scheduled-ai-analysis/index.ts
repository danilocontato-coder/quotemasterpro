import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('[scheduled-ai-analysis] Iniciando processamento...');

    // Buscar negociações pendentes de análise
    const { data: pendingNegotiations, error } = await supabaseClient
      .from('ai_negotiations')
      .select('id, quote_id, created_at')
      .eq('status', 'analyzing')
      .order('created_at', { ascending: true })
      .limit(5);

    if (error) throw error;

    if (!pendingNegotiations || pendingNegotiations.length === 0) {
      console.log('[scheduled-ai-analysis] Nenhuma análise pendente');
      return new Response(JSON.stringify({ 
        message: 'Nenhuma análise pendente',
        processed: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[scheduled-ai-analysis] ${pendingNegotiations.length} análises pendentes`);

    const results = [];

    // Processar cada negociação
    for (const negotiation of pendingNegotiations) {
      try {
        // Chamar edge function ai-negotiation-agent
        const { data: result, error: analyzeError } = await supabaseClient.functions.invoke(
          'ai-negotiation-agent',
          {
            body: {
              action: 'analyze',
              quoteId: negotiation.quote_id,
            },
          }
        );

        if (analyzeError) {
          console.error(`[scheduled-ai-analysis] Erro ao analisar ${negotiation.id}:`, analyzeError);
          results.push({
            negotiation_id: negotiation.id,
            success: false,
            error: analyzeError.message,
          });
        } else {
          console.log(`[scheduled-ai-analysis] Análise concluída: ${negotiation.id}`);
          results.push({
            negotiation_id: negotiation.id,
            success: true,
          });
        }
      } catch (err: any) {
        console.error(`[scheduled-ai-analysis] Exceção ao processar ${negotiation.id}:`, err.message);
        results.push({
          negotiation_id: negotiation.id,
          success: false,
          error: err.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    console.log(`[scheduled-ai-analysis] Processamento concluído: ${successCount}/${results.length} sucesso`);

    return new Response(JSON.stringify({
      message: 'Processamento concluído',
      processed: results.length,
      successful: successCount,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[scheduled-ai-analysis] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
