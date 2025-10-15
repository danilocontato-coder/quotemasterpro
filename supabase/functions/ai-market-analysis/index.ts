import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    console.log('🔍 Iniciando análise de mercado...');

    // Buscar dados agregados do sistema
    const [
      { data: quotes, error: quotesError },
      { data: clients, error: clientsError },
      { data: suppliers, error: suppliersError },
      { data: payments, error: paymentsError }
    ] = await Promise.all([
      supabaseClient.from('quotes').select('id, client_id, total, status, created_at, deadline, supplier_scope').order('created_at', { ascending: false }).limit(500),
      supabaseClient.from('clients').select('id, name, status, subscription_plan_id, created_at'),
      supabaseClient.from('suppliers').select('id, name, region, state, city, specialties, status, is_certified, rating'),
      supabaseClient.from('payments').select('id, amount, status, created_at')
    ]);

    if (quotesError || clientsError || suppliersError || paymentsError) {
      console.error('Erro ao buscar dados:', { quotesError, clientsError, suppliersError, paymentsError });
      throw new Error('Falha ao buscar dados do sistema');
    }

    console.log(`📊 Dados carregados: ${quotes?.length} cotações, ${clients?.length} clientes, ${suppliers?.length} fornecedores`);

    // Preparar dados para análise da IA
    const analysisData = {
      total_quotes: quotes?.length || 0,
      total_clients: clients?.length || 0,
      total_suppliers: suppliers?.length || 0,
      
      // Análise regional
      quotes_by_scope: quotes?.reduce((acc: any, q: any) => {
        const scope = q.supplier_scope || 'local';
        acc[scope] = (acc[scope] || 0) + 1;
        return acc;
      }, {}),
      
      suppliers_by_region: suppliers?.reduce((acc: any, s: any) => {
        const region = s.region || 'unknown';
        acc[region] = (acc[region] || 0) + 1;
        return acc;
      }, {}),
      
      suppliers_by_state: suppliers?.reduce((acc: any, s: any) => {
        const state = s.state || 'unknown';
        acc[state] = (acc[state] || 0) + 1;
        return acc;
      }, {}),
      
      // Análise de performance
      total_payment_volume: payments?.filter((p: any) => p.status === 'completed').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0,
      
      active_clients: clients?.filter((c: any) => c.status === 'active').length || 0,
      active_suppliers: suppliers?.filter((s: any) => s.status === 'active').length || 0,
      
      certified_suppliers: suppliers?.filter((s: any) => s.is_certified).length || 0,
      
      // Análise de especialidades
      top_specialties: suppliers?.reduce((acc: any, s: any) => {
        if (s.specialties) {
          s.specialties.forEach((spec: string) => {
            acc[spec] = (acc[spec] || 0) + 1;
          });
        }
        return acc;
      }, {})
    };

    console.log('🤖 Enviando para Perplexity AI...');

    // Chamar Perplexity API
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY não configurada');
    }

    const aiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        temperature: 0.2,
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: `Você é um analista de mercado especializado em prospecção B2B para marketplaces de cotações.
Analise os dados fornecidos e retorne insights acionáveis sobre:
1. Regiões/estados com maior potencial de crescimento
2. Segmentos de clientes sub-atendidos
3. Gaps de fornecedores por especialidade/região
4. Oportunidades de expansão prioritárias
5. Recomendações específicas de prospecção

Seja direto, objetivo e foque em insights que gerem receita.`
          },
          {
            role: 'user',
            content: `Analise estes dados do marketplace:\n\n${JSON.stringify(analysisData, null, 2)}\n\nRetorne análise estruturada com insights de prospecção.`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_market_insights',
              description: 'Retornar análise estruturada do mercado com insights de prospecção',
              parameters: {
                type: 'object',
                properties: {
                  priority_regions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        potential: { type: 'string', enum: ['alto', 'medio', 'baixo'] },
                        reasoning: { type: 'string' },
                        estimated_revenue: { type: 'number' }
                      },
                      required: ['name', 'potential', 'reasoning']
                    }
                  },
                  underserved_segments: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        segment: { type: 'string' },
                        gap_description: { type: 'string' },
                        opportunity_score: { type: 'number' }
                      }
                    }
                  },
                  supplier_gaps: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        specialty: { type: 'string' },
                        region: { type: 'string' },
                        demand_level: { type: 'string' },
                        current_supply: { type: 'number' }
                      }
                    }
                  },
                  recommended_actions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        action: { type: 'string' },
                        priority: { type: 'string', enum: ['urgente', 'alta', 'media', 'baixa'] },
                        expected_impact: { type: 'string' },
                        estimated_leads: { type: 'number' }
                      }
                    }
                  },
                  key_metrics: {
                    type: 'object',
                    properties: {
                      market_health_score: { type: 'number' },
                      growth_potential: { type: 'string' },
                      competitive_position: { type: 'string' }
                    }
                  }
                },
                required: ['priority_regions', 'recommended_actions'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_market_insights' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro da IA:', aiResponse.status, errorText);
      throw new Error(`IA Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('✅ Resposta da IA recebida');

    // Extrair resultado estruturado
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const insights = toolCall ? JSON.parse(toolCall.function.arguments) : {};

    return new Response(
      JSON.stringify({ 
        success: true, 
        insights,
        data_analyzed: {
          quotes_count: analysisData.total_quotes,
          clients_count: analysisData.total_clients,
          suppliers_count: analysisData.total_suppliers
        },
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro na análise:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
