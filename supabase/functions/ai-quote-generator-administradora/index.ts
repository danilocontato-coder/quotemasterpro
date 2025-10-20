import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      description,
      administradoraId,
      targetType,
      targetCondominioId,
      clientInfo,
      preferences
    } = await req.json();

    console.log('AI Quote Generator - Administradora:', {
      administradoraId,
      targetType,
      targetCondominioId: targetCondominioId || 'null'
    });

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase não configurado corretamente');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar contexto adicional se cotação for para condomínio
    let condominioContext = '';
    if (targetType === 'condominio' && targetCondominioId) {
      const { data: condominio, error: condError } = await supabase
        .from('clients')
        .select('name, address, cnpj')
        .eq('id', targetCondominioId)
        .single();

      if (condError) {
        console.error('Error fetching condominio:', condError);
      } else if (condominio) {
        condominioContext = `

Esta cotação está sendo criada EM NOME DO CONDOMÍNIO:
- Nome: ${condominio.name}
- Endereço: ${condominio.address || 'Não informado'}
- CNPJ: ${condominio.cnpj || 'Não informado'}

Adapte os itens e quantidades para as necessidades específicas deste condomínio.`;
      }
    }

    // Construir prompt
    const systemPrompt = `Você é um assistente especializado em criar cotações para administradoras de condomínios.
    
${condominioContext}

Gere uma cotação detalhada considerando:
- Tipo de propriedade (condomínio residencial/comercial)
- Quantidade de unidades (se mencionado)
- Necessidades específicas de manutenção
- Conformidade com normas de segurança
- Prioridades: ${preferences?.priorities || 'qualidade_prazo'}

Responda APENAS em formato JSON válido:
{
  "title": "Título conciso da cotação (máx 100 caracteres)",
  "description": "Descrição detalhada (máx 500 caracteres)",
  "items": [
    {
      "product_name": "Nome do produto/serviço",
      "quantity": número,
      "unit": "unidade de medida (ex: unid, kg, m², litro)",
      "description": "Descrição detalhada do item"
    }
  ],
  "considerations": ["Consideração importante 1", "Consideração importante 2"]
}

Inclua no mínimo 3 e no máximo 8 itens relevantes.`;

    // Chamar OpenAI
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
          { role: 'user', content: description }
        ],
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received, tokens used:', data.usage?.total_tokens);

    const parsedQuote = JSON.parse(data.choices[0].message.content);

    // Calcular custo (1 crédito por 1000 tokens)
    const tokensUsed = data.usage?.total_tokens || 0;
    const cost = Math.ceil(tokensUsed / 1000);

    console.log('Cost calculated:', cost, 'credits');

    // Verificar créditos disponíveis
    const { data: currentCredits, error: creditsError } = await supabase
      .from('ai_credits')
      .select('available_credits, total_spent')
      .eq('client_id', administradoraId)
      .single();

    if (creditsError) {
      console.error('Error fetching credits:', creditsError);
      throw new Error('Erro ao verificar créditos disponíveis');
    }

    if (!currentCredits || currentCredits.available_credits < cost) {
      return new Response(
        JSON.stringify({
          error: 'Créditos AI insuficientes',
          required: cost,
          available: currentCredits?.available_credits || 0
        }),
        {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Debitar créditos
    const { error: updateError } = await supabase
      .from('ai_credits')
      .update({
        available_credits: currentCredits.available_credits - cost,
        total_spent: currentCredits.total_spent + cost,
        updated_at: new Date().toISOString()
      })
      .eq('client_id', administradoraId);

    if (updateError) {
      console.error('Error updating credits:', updateError);
      throw new Error('Erro ao debitar créditos');
    }

    // Registrar transação
    const { error: transactionError } = await supabase
      .from('ai_credits_transactions')
      .insert({
        client_id: administradoraId,
        amount: -cost,
        reason: 'ai_quote_generation',
        reference_id: null, // Será atualizado quando a cotação for criada
        metadata: {
          target_type: targetType,
          target_condominio_id: targetCondominioId || null,
          tokens_used: tokensUsed,
          model: 'gpt-4o-mini'
        }
      });

    if (transactionError) {
      console.error('Error logging transaction:', transactionError);
      // Não falhar por causa disso, apenas logar
    }

    console.log('Quote generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        quote: {
          ...parsedQuote,
          on_behalf_of_client_id: targetCondominioId || null,
          administradora_id: administradoraId,
          deadline: preferences?.deadline || null
        },
        credits_used: cost,
        credits_remaining: currentCredits.available_credits - cost
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in ai-quote-generator-administradora:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro interno do servidor',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
