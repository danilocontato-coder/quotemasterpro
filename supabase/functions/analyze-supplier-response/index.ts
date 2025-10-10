import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      conversation_id,
      question_text,
      question_category,
      supplier_response,
      quote_context 
    } = await req.json();

    console.log('Analyzing supplier response:', {
      conversation_id,
      question_category,
      response_length: supplier_response?.length
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Sistema de análise focado em aspectos técnicos/operacionais (sem valores comerciais)
    const systemPrompt = `Você é um assistente de análise de comunicações em uma plataforma de cotações B2B.

CONTEXTO:
Esta plataforma controla rigorosamente as comunicações para garantir transparência e prevenir negociações paralelas. 
Valores, preços, descontos e condições comerciais DEVEM ser enviados apenas via propostas formais na plataforma.

SEU PAPEL:
Analise respostas de fornecedores a perguntas técnicas/operacionais e identifique:

1. COMPLETUDE (0-100): A resposta está completa e clara?
2. CLAREZA (0-100): A informação é objetiva e fácil de entender?
3. RED FLAGS: Detectar tentativas de:
   - Mencionar valores, preços ou orçamentos
   - Sugerir negociações fora da plataforma
   - Respostas evasivas ou vagas demais
   - Solicitar contato direto para "discutir valores"

4. SUGESTÕES DE FOLLOW-UP: Se a resposta for incompleta ou vaga, sugira perguntas de acompanhamento TÉCNICAS (nunca sobre valores)

FORMATO DE RESPOSTA (JSON):
{
  "analysis": {
    "completeness_score": number,
    "clarity_score": number,
    "confidence_level": "high" | "medium" | "low",
    "red_flags": ["lista de problemas identificados"],
    "summary": "resumo da análise"
  },
  "follow_up_suggestions": [
    {
      "question": "texto da pergunta sugerida",
      "category": "especificações | logística | operacional",
      "reasoning": "porque essa pergunta é relevante",
      "priority": "high" | "medium" | "low"
    }
  ],
  "contextual_insights": "insights adicionais para o cliente"
}`;

    const userPrompt = `PERGUNTA ORIGINAL:
Categoria: ${question_category}
Pergunta: ${question_text}

RESPOSTA DO FORNECEDOR:
${supplier_response}

CONTEXTO DA COTAÇÃO:
- ID: ${quote_context?.quote_id}
- Título: ${quote_context?.quote_title}
- Fornecedor: ${quote_context?.supplier_name}

Analise a resposta conforme as diretrizes e retorne o JSON.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit excedido. Tente novamente em alguns instantes.' 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Créditos insuficientes. Adicione créditos ao workspace.' 
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('Empty AI response');
    }

    let analysis;
    try {
      analysis = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Invalid AI response format');
    }

    console.log('Analysis completed:', {
      completeness: analysis.analysis?.completeness_score,
      red_flags_count: analysis.analysis?.red_flags?.length || 0,
      suggestions_count: analysis.follow_up_suggestions?.length || 0
    });

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-supplier-response:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        analysis: {
          completeness_score: 0,
          clarity_score: 0,
          confidence_level: 'low',
          red_flags: ['Erro ao analisar resposta'],
          summary: 'Não foi possível analisar a resposta automaticamente.'
        },
        follow_up_suggestions: [],
        contextual_insights: 'Revise manualmente a resposta do fornecedor.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
