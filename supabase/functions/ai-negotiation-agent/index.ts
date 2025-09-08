import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, quoteId, negotiationId } = await req.json();
    console.log(`AI Negotiation Agent - Action: ${action}, Quote: ${quoteId}, Negotiation: ${negotiationId}`);

    switch (action) {
      case 'analyze':
        return await analyzeQuote(quoteId);
      case 'negotiate':
        return await startNegotiation(negotiationId);
      case 'approve':
        return await approveNegotiation(negotiationId);
      case 'reject':
        return await rejectNegotiation(negotiationId);
      default:
        throw new Error('Ação inválida');
    }
  } catch (error) {
    console.error('Erro na edge function AI Negotiation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function analyzeQuote(quoteId: string) {
  console.log(`Analisando cotação: ${quoteId}`);
  
  // Buscar cotação, itens e respostas
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select(`
      *,
      quote_items (*),
      quote_responses (*)
    `)
    .eq('id', quoteId)
    .single();

  if (quoteError || !quote) {
    throw new Error('Cotação não encontrada');
  }

  if (!quote.quote_responses || quote.quote_responses.length === 0) {
    throw new Error('Nenhuma proposta encontrada para análise');
  }

  if (!quote.quote_items || quote.quote_items.length === 0) {
    throw new Error('Nenhum item encontrado na cotação para análise');
  }

  // Encontrar a melhor proposta (menor valor)
  const bestResponse = quote.quote_responses.reduce((best: any, current: any) => 
    current.total_amount < best.total_amount ? current : best
  );

  // Calcular preço médio do mercado
  const averagePrice = quote.quote_responses.reduce((sum: number, resp: any) => 
    sum + resp.total_amount, 0) / quote.quote_responses.length;

  // Determinar se vale a pena negociar
  const negotiationPotential = ((bestResponse.total_amount - averagePrice * 0.85) / bestResponse.total_amount) * 100;
  const shouldNegotiate = negotiationPotential > 5; // Se há mais de 5% de margem

  // Buscar configurações de IA
  const { data: aiSettings } = await supabase
    .from('ai_settings')
    .select('*')
    .limit(1)
    .single();

  const usePerplexity = aiSettings?.negotiation_provider === 'perplexity';
  const apiKey = usePerplexity ? perplexityApiKey : openAIApiKey;
  const model = usePerplexity ? (aiSettings?.perplexity_model || 'llama-3.1-sonar-large-128k-online') : (aiSettings?.openai_model || 'gpt-5-2025-08-07');

  if (!apiKey) {
    throw new Error(`Chave da API ${usePerplexity ? 'Perplexity' : 'OpenAI'} não configurada`);
  }

  // Criar análise da IA
  const analysisPrompt = `
Você é um especialista em negociações comerciais brasileiras. Analise esta situação:

Cotação: ${quote.title || quote.description}

Itens solicitados:
${quote.quote_items.map((item: any) => 
  `- ${item.product_name} (Qtd: ${item.quantity}, Preço estimado: R$ ${item.unit_price || 0})`
).join('\n')}
Melhor proposta atual: R$ ${bestResponse.total_amount.toLocaleString('pt-BR')}
Fornecedor: ${bestResponse.supplier_name}
Preço médio das propostas: R$ ${averagePrice.toLocaleString('pt-BR')}
Margem de negociação estimada: ${negotiationPotential.toFixed(1)}%

${usePerplexity ? 'Baseando-se em dados atuais do mercado brasileiro,' : ''} forneça uma análise em português com:
1. Razão para negociar (máximo 150 caracteres)
2. Estratégia de negociação (máximo 200 caracteres)
3. Desconto objetivo realista (percentual entre 3-15%)

Responda APENAS no formato JSON:
{
  "reason": "razão aqui",
  "strategy": "estratégia aqui", 
  "targetDiscount": numero_percentual
}`;

  try {
    const apiUrl = usePerplexity 
      ? 'https://api.perplexity.ai/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const requestBody = usePerplexity 
      ? {
          model,
          messages: [{ role: 'user', content: analysisPrompt }],
          temperature: 0.2,
          max_tokens: 500,
        }
      : {
          model,
          messages: [{ role: 'user', content: analysisPrompt }],
          max_completion_tokens: 500,
        };

    const analysisResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const analysisData = await analysisResponse.json();
    let aiAnalysis;
    
    try {
      aiAnalysis = JSON.parse(analysisData.choices[0].message.content);
    } catch (parseError) {
      // Fallback case
      aiAnalysis = {
        reason: "Preço acima da média de mercado, há margem para negociação",
        strategy: "Abordagem colaborativa enfatizando relacionamento de longo prazo",
        targetDiscount: Math.min(Math.max(negotiationPotential * 0.6, 3), 15)
      };
    }

    // Criar registro de negociação
    const { data: negotiation, error: negotiationError } = await supabase
      .from('ai_negotiations')
      .insert({
        quote_id: quoteId,
        selected_response_id: bestResponse.id,
        original_amount: bestResponse.total_amount,
        ai_analysis: aiAnalysis,
        negotiation_strategy: {
          reason: aiAnalysis.reason,
          strategy: aiAnalysis.strategy,
          targetDiscount: aiAnalysis.targetDiscount,
          marketAverage: averagePrice,
          negotiationPotential: negotiationPotential,
          provider: usePerplexity ? 'perplexity' : 'openai',
          model: model
        },
        status: shouldNegotiate ? 'analyzed' : 'not_viable'
      })
      .select()
      .single();

    if (negotiationError) {
      throw new Error('Erro ao criar registro de negociação');
    }

    console.log(`Análise concluída para cotação ${quoteId}:`, aiAnalysis);

    return new Response(
      JSON.stringify({ 
        success: true, 
        negotiation,
        shouldNegotiate,
        analysis: aiAnalysis,
        provider: usePerplexity ? 'perplexity' : 'openai'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (apiError) {
    console.error('Erro na API OpenAI:', apiError);
    throw new Error('Erro ao analisar cotação com IA');
  }
}

async function startNegotiation(negotiationId: string) {
  console.log(`Iniciando negociação: ${negotiationId}`);
  
  // Buscar negociação
  const { data: negotiation, error: negotiationError } = await supabase
    .from('ai_negotiations')
    .select('*, quote_responses(*)')
    .eq('id', negotiationId)
    .single();

  if (negotiationError || !negotiation) {
    throw new Error('Negociação não encontrada');
  }

  const targetDiscount = negotiation.negotiation_strategy.targetDiscount || 8;
  const proposedAmount = negotiation.original_amount * (1 - targetDiscount / 100);

  // Gerar mensagem inicial de negociação usando GPT-5
  const negotiationPrompt = `
Você é um assistente de compras profissional iniciando uma negociação comercial.

Contexto:
- Proposta atual: R$ ${negotiation.original_amount.toLocaleString('pt-BR')}
- Valor proposto: R$ ${proposedAmount.toLocaleString('pt-BR')}
- Estratégia: ${negotiation.negotiation_strategy.strategy}
- Razão: ${negotiation.negotiation_strategy.reason}

Escreva UMA mensagem de abertura de negociação em português, sendo:
- Profissional e respeitosa
- Máximo 200 caracteres
- Enfatizando parceria de longo prazo
- Propondo o valor específico

Responda APENAS a mensagem, sem aspas ou formatação.`;

  try {
    const messageResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [{ role: 'user', content: negotiationPrompt }],
        max_completion_tokens: 300,
      }),
    });

    const messageData = await messageResponse.json();
    const aiMessage = messageData.choices[0].message.content.trim();

    // Simular resposta do fornecedor (para demonstração)
    const supplierResponses = [
      `Entendo a proposta. Posso trabalhar com R$ ${(proposedAmount * 1.03).toLocaleString('pt-BR')} considerando o relacionamento.`,
      `O valor está apertado. Minha contraproposta é R$ ${(proposedAmount * 1.05).toLocaleString('pt-BR')}.`,
      `Vou aceitar R$ ${proposedAmount.toLocaleString('pt-BR')} para garantir esta parceria.`,
      `Preciso de R$ ${(proposedAmount * 1.02).toLocaleString('pt-BR')} para manter a qualidade.`
    ];

    const supplierResponse = supplierResponses[Math.floor(Math.random() * supplierResponses.length)];
    
    // Extrair valor da resposta do fornecedor
    const supplierAmountMatch = supplierResponse.match(/R\$\s*([\d.,]+)/);
    const finalAmount = supplierAmountMatch ? 
      parseFloat(supplierAmountMatch[1].replace(/[.,]/g, m => m === ',' ? '.' : '')) : 
      proposedAmount;

    const conversationLog = [
      {
        role: 'ai',
        message: aiMessage,
        timestamp: new Date().toISOString()
      },
      {
        role: 'supplier',
        message: supplierResponse,
        timestamp: new Date(Date.now() + 300000).toISOString() // 5 min depois
      }
    ];

    // Atualizar negociação
    const { data: updatedNegotiation, error: updateError } = await supabase
      .from('ai_negotiations')
      .update({
        status: 'completed',
        negotiated_amount: finalAmount,
        discount_percentage: ((negotiation.original_amount - finalAmount) / negotiation.original_amount) * 100,
        conversation_log: conversationLog,
        completed_at: new Date().toISOString()
      })
      .eq('id', negotiationId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Erro ao atualizar negociação');
    }

    console.log(`Negociação ${negotiationId} concluída. Valor final: R$ ${finalAmount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        negotiation: updatedNegotiation,
        savings: negotiation.original_amount - finalAmount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (apiError) {
    console.error('Erro na negociação:', apiError);
    throw new Error('Erro ao realizar negociação');
  }
}

async function approveNegotiation(negotiationId: string) {
  const { data, error } = await supabase
    .from('ai_negotiations')
    .update({
      status: 'approved',
      human_approved: true,
      approved_by: 'current_user' // Em produção, pegar do auth
    })
    .eq('id', negotiationId)
    .select()
    .single();

  if (error) {
    throw new Error('Erro ao aprovar negociação');
  }

  return new Response(
    JSON.stringify({ success: true, negotiation: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function rejectNegotiation(negotiationId: string) {
  const { data, error } = await supabase
    .from('ai_negotiations')
    .update({
      status: 'rejected',
      human_approved: false
    })
    .eq('id', negotiationId)
    .select()
    .single();

  if (error) {
    throw new Error('Erro ao rejeitar negociação');
  }

  return new Response(
    JSON.stringify({ success: true, negotiation: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}