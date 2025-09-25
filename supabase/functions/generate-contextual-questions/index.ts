import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Conectar ao Supabase para buscar configurações de IA
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { quote_id, quote_title, existing_questions } = await req.json();

    console.log('Generating contextual questions for:', { quote_id, quote_title, existing_questions });

    // Buscar configurações de IA do superadmin
    let aiModel = 'gpt-4o-mini'; // padrão
    try {
      const { data: aiSettings } = await supabase
        .from('ai_settings')
        .select('openai_model, negotiation_provider')
        .limit(1)
        .single();
      
      if (aiSettings?.openai_model && aiSettings?.negotiation_provider === 'openai') {
        aiModel = aiSettings.openai_model;
        console.log('Using AI model from settings:', aiModel);
      }
    } catch (error) {
      console.log('Using default AI model, settings not found:', error);
    }

    const prompt = `
Como especialista em aquisições corporativas, analise esta cotação e sugira 3-5 perguntas contextuais estruturadas que um cliente deveria fazer ao fornecedor.

**Cotação:** ${quote_title}
**ID:** ${quote_id}
**Perguntas já existentes:** ${existing_questions}

**Contexto:** O sistema de esclarecimentos usa categorias pré-definidas:
- Especificações (marca, técnicas, qualidade)
- Logística (prazo, entrega, horário)
- Comercial (desconto, parcelamento, garantia)
- Operacional (responsável, instalação, suporte)

**Instrução:** Sugira perguntas ESPECÍFICAS para esta cotação que complementem o que já existe, focando em esclarecimentos técnicos e operacionais importantes.

Retorne um JSON com este formato:
{
  "suggestions": [
    {
      "category": "especificações",
      "question": "Pergunta específica aqui?",
      "reasoning": "Por que esta pergunta é importante para esta cotação"
    }
  ]
}
`;

    // Verificar chave da OpenAI
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY não configurada nas secrets do Supabase Functions');
      return new Response(JSON.stringify({
        error: 'OPENAI_API_KEY não configurada',
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const isModernModel = /^(gpt-5|gpt-4\.1|o3|o4)/.test(aiModel);

    const baseMessages = [
      { 
        role: 'system', 
        content: 'Você é um especialista em aquisições corporativas que gera perguntas contextuais para esclarecimentos entre clientes e fornecedores. Sempre retorne JSON válido.' 
      },
      { role: 'user', content: prompt }
    ];

    const buildPayload = (model: string, modern: boolean) => {
      const p: Record<string, unknown> = { model, messages: baseMessages };
      if (modern) {
        p.max_completion_tokens = 800;
      } else {
        p.max_tokens = 800;
        p.temperature = 0.7;
      }
      return p;
    }

    // Primeira tentativa com o modelo configurado
    let response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildPayload(aiModel, isModernModel)),
    });

    // Fallback se o modelo falhar
    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI API error (primary model) details:', errText);
      const fallbackModel = 'gpt-4o-mini';
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildPayload(fallbackModel, false)),
      });

      if (!response.ok) {
        const errText2 = await response.text();
        console.error('OpenAI API error (fallback model) details:', errText2);
        throw new Error(`OpenAI API error (fallback): ${response.status}`);
      }
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content;

    console.log('Generated content:', generatedContent);

    if (!generatedContent || generatedContent.trim() === '') {
      console.error('AI returned empty content');
      return new Response(JSON.stringify({
        suggestions: [
          {
            category: "especificações",
            question: "Qual o prazo de validade desta proposta?",
            reasoning: "Importante definir o período de validade da oferta"
          },
          {
            category: "logística", 
            question: "Qual o prazo de entrega estimado?",
            reasoning: "Essencial para planejamento de recebimento"
          },
          {
            category: "comercial",
            question: "Há possibilidade de desconto para pagamento à vista?", 
            reasoning: "Importante avaliar condições comerciais"
          }
        ]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse JSON response
    let suggestions;
    try {
      suggestions = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback com perguntas padrão
      suggestions = {
        suggestions: [
          {
            category: "especificações",
            question: "Qual o prazo de validade desta proposta?",
            reasoning: "Importante definir o período de validade da oferta"
          },
          {
            category: "logística", 
            question: "Qual o prazo de entrega estimado?",
            reasoning: "Essencial para planejamento de recebimento"
          },
          {
            category: "comercial",
            question: "Há possibilidade de desconto para pagamento à vista?", 
            reasoning: "Importante avaliar condições comerciais"
          }
        ]
      };
    }

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-contextual-questions function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Falha ao gerar perguntas contextuais',
        details: error instanceof Error ? error.message : String(error)
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});