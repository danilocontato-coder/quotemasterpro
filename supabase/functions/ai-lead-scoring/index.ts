import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadScoringRequest {
  segment: string;
  type: 'client' | 'supplier';
  region?: string;
  max_leads?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { segment, type, region, max_leads = 50 }: LeadScoringRequest = await req.json();

    console.log(`🎯 Gerando leads: ${type} - ${segment} - ${region || 'todas regiões'}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Buscar dados existentes para contexto
    const [
      { data: existingClients },
      { data: existingSuppliers },
      { data: recentQuotes }
    ] = await Promise.all([
      supabaseClient.from('clients').select('name, cnpj').limit(100),
      supabaseClient.from('suppliers').select('name, cnpj, specialties, region, state').limit(100),
      supabaseClient.from('quotes').select('title, total, deadline, supplier_scope').order('created_at', { ascending: false }).limit(100)
    ]);

    console.log('🤖 Chamando IA para gerar leads...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em geração de leads B2B para marketplaces.
Sua tarefa é gerar uma lista realista de ${type === 'client' ? 'empresas' : 'fornecedores'} potenciais no segmento "${segment}" ${region ? `na região "${region}"` : ''}.

Para cada lead, forneça:
- Nome fictício mas realista da empresa
- Score de qualificação (0-100) baseado no potencial
- Insights sobre por que este lead é promissor
- Receita estimada mensal que pode gerar
- Plano recomendado

Crie leads DIVERSOS, evitando repetições. Use variações de nomes, tamanhos e localizações.`
          },
          {
            role: 'user',
            content: `Gere ${max_leads} leads de ${type === 'client' ? 'clientes' : 'fornecedores'} para o segmento "${segment}" ${region ? `em ${region}` : ''}.

Contexto do mercado atual:
- Clientes existentes: ${existingClients?.length || 0}
- Fornecedores existentes: ${existingSuppliers?.length || 0}
- Principais especialidades em demanda: ${recentQuotes?.slice(0, 10).map(q => q.title).join(', ')}

Gere leads DIFERENTES dos existentes, focando em gaps e oportunidades.`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_leads',
              description: 'Gerar lista qualificada de leads potenciais',
              parameters: {
                type: 'object',
                properties: {
                  leads: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        company_name: { type: 'string' },
                        score: { type: 'number', minimum: 0, maximum: 100 },
                        segment: { type: 'string' },
                        region: { type: 'string' },
                        state: { type: 'string' },
                        city: { type: 'string' },
                        contact_data: {
                          type: 'object',
                          properties: {
                            estimated_size: { type: 'string' },
                            estimated_employees: { type: 'number' },
                            likely_decision_maker: { type: 'string' }
                          }
                        },
                        ai_insights: {
                          type: 'object',
                          properties: {
                            reasoning: { type: 'string' },
                            potential_revenue_monthly: { type: 'number' },
                            recommended_plan: { type: 'string' },
                            key_selling_points: {
                              type: 'array',
                              items: { type: 'string' }
                            },
                            estimated_quotes_per_month: { type: 'number' }
                          }
                        }
                      },
                      required: ['company_name', 'score', 'segment', 'ai_insights']
                    }
                  },
                  summary: {
                    type: 'object',
                    properties: {
                      total_leads: { type: 'number' },
                      avg_score: { type: 'number' },
                      total_potential_revenue: { type: 'number' },
                      top_3_opportunities: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    }
                  }
                },
                required: ['leads', 'summary'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_leads' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro da IA:', aiResponse.status, errorText);
      throw new Error(`IA Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : { leads: [], summary: {} };

    console.log(`✅ ${result.leads?.length || 0} leads gerados com score médio ${result.summary?.avg_score || 0}`);

    // Inserir leads no banco
    if (result.leads && result.leads.length > 0) {
      const { data: authUser } = await supabaseClient.auth.getUser();
      
      const leadsToInsert = result.leads.map((lead: any) => ({
        type: type,
        score: lead.score,
        segment: lead.segment || segment,
        region: lead.region || region,
        state: lead.state,
        city: lead.city,
        contact_data: lead.contact_data || {},
        ai_insights: lead.ai_insights || {},
        status: 'new',
        created_by: authUser?.user?.id
      }));

      const { data: insertedLeads, error: insertError } = await supabaseClient
        .from('ai_leads')
        .insert(leadsToInsert)
        .select();

      if (insertError) {
        console.error('Erro ao inserir leads:', insertError);
        throw insertError;
      }

      console.log(`💾 ${insertedLeads?.length || 0} leads salvos no banco`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        leads: result.leads,
        summary: result.summary,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Erro ao gerar leads:', error);
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
