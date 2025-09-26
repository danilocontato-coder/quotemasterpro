import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar chave da API do OpenAI das configurações do sistema
    const { data: aiSettings, error: settingsError } = await supabaseClient
      .from('ai_negotiation_settings')
      .select('setting_value')
      .eq('setting_key', 'openai_api_key')
      .eq('active', true)
      .single();

    if (settingsError || !aiSettings?.setting_value) {
      console.error('OpenAI API key not found in settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = typeof aiSettings.setting_value === 'string' 
      ? aiSettings.setting_value 
      : aiSettings.setting_value.value || aiSettings.setting_value;

    const { description, clientInfo, preferences } = await req.json();

    console.log('Generating AI quote for:', { description, clientInfo, preferences });

    // Prompt para gerar cotação estruturada
    const systemPrompt = `Você é um assistente especializado em criar cotações detalhadas para condomínios e empresas no Brasil.

Baseado na descrição fornecida, gere uma cotação estruturada com:
1. Título claro e profissional
2. Lista de itens necessários com quantidades estimadas
3. Descrições técnicas apropriadas
4. Considerações especiais se aplicável

Seja preciso e profissional. Use termos técnicos apropriados para o setor.

Responda APENAS em formato JSON com esta estrutura exata:
{
  "title": "Título da cotação",
  "description": "Descrição detalhada expandida",
  "items": [
    {
      "product_name": "Nome do produto/serviço",
      "quantity": número_inteiro,
      "unit": "unidade (ex: m², kg, peça, etc.)",
      "description": "Descrição técnica detalhada"
    }
  ],
  "considerations": ["Consideração 1", "Consideração 2"]
}`;

    const userPrompt = `
Descrição da necessidade: ${description}

Informações do cliente:
- Nome: ${clientInfo?.name || 'Não informado'}
- Tipo: ${clientInfo?.type || 'Condomínio'}
- Localização: ${clientInfo?.location || 'Não informado'}

Preferências:
- Orçamento aproximado: ${preferences?.budget || 'Não informado'}
- Prazo: ${preferences?.deadline || 'Não informado'}
- Prioridades: ${preferences?.priorities || 'Qualidade e prazo'}

Gere uma cotação detalhada e profissional.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Generated content:', generatedContent);

    // Parse do JSON gerado
    let parsedQuote;
    try {
      parsedQuote = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback se o parsing falhar
      parsedQuote = {
        title: "Cotação Gerada por IA",
        description: description,
        items: [{
          product_name: "Item a ser especificado",
          quantity: 1,
          unit: "unidade",
          description: "Especificação a ser detalhada"
        }],
        considerations: ["Especificações detalhadas necessárias"]
      };
    }

    return new Response(JSON.stringify({
      success: true,
      quote: parsedQuote
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-quote-generator:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});