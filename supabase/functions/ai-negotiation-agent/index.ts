import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface QuoteAnalysis {
  bestResponse: any;
  analysisReason: string;
  negotiationStrategy: any;
  potentialSavings: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, quoteId, negotiationId } = await req.json();
    console.log(`AI Negotiation Agent - Action: ${action}, Quote: ${quoteId}`);

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
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in ai-negotiation-agent:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeQuote(quoteId: string) {
  console.log(`Analyzing quote: ${quoteId}`);
  
  // Buscar cotação e propostas
  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  const { data: responses } = await supabase
    .from('quote_responses')
    .select('*')
    .eq('quote_id', quoteId);

  const { data: supplier_data } = await supabase
    .from('suppliers')
    .select('*')
    .in('id', responses?.map(r => r.supplier_id) || []);

  if (!quote || !responses || responses.length === 0) {
    throw new Error('Quote or responses not found');
  }

  // Análise com IA
  const analysis = await analyzeWithAI(quote, responses, supplier_data);
  
  // Atualizar negociação com análise
  const { data: negotiation } = await supabase
    .from('ai_negotiations')
    .update({
      selected_response_id: analysis.bestResponse.id,
      ai_analysis: analysis,
      status: 'completed'
    })
    .eq('quote_id', quoteId)
    .select()
    .single();

  // Atualizar status da cotação
  await supabase
    .from('quotes')
    .update({ status: 'ai_negotiating' })
    .eq('id', quoteId);

  console.log('Analysis completed:', analysis);
  
  return new Response(JSON.stringify({
    success: true,
    analysis,
    negotiation
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function analyzeWithAI(quote: any, responses: any[], suppliers: any[]): Promise<QuoteAnalysis> {
  const prompt = `
Você é um especialista em negociação empresarial. Analise estas propostas para a cotação "${quote.title}":

COTAÇÃO:
- Valor estimado: R$ ${quote.total}
- Descrição: ${quote.description}
- Prazo: ${quote.deadline}

PROPOSTAS RECEBIDAS:
${responses.map((r, i) => `
${i + 1}. Fornecedor: ${r.supplier_name}
   - Valor: R$ ${r.total_amount}
   - Prazo: ${r.delivery_time} dias
   - Observações: ${r.notes || 'Nenhuma'}
`).join('')}

DADOS DOS FORNECEDORES:
${suppliers.map(s => `
- ${s.name}: Rating ${s.rating}/5, ${s.completed_orders} pedidos concluídos
  Especialidades: ${s.specialties?.join(', ') || 'N/A'}
`).join('')}

Sua tarefa:
1. Escolha a MELHOR proposta considerando preço, qualidade, prazo e histórico
2. Calcule uma margem de negociação realista (5-15% tipicamente)
3. Crie uma estratégia de negociação humanizada e respeitosa

Responda APENAS em JSON válido:
{
  "bestResponseIndex": 0,
  "analysisReason": "Explicação detalhada da escolha",
  "negotiationStrategy": {
    "targetDiscount": 8.5,
    "maxDiscount": 12,
    "approach": "volume/payment_terms/relationship",
    "talking_points": ["ponto 1", "ponto 2"]
  },
  "potentialSavings": 1250.50,
  "riskAssessment": "low/medium/high"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um especialista em negociação empresarial. Sempre responda com JSON válido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    const aiResponse = JSON.parse(data.choices[0].message.content);
    
    return {
      bestResponse: responses[aiResponse.bestResponseIndex],
      analysisReason: aiResponse.analysisReason,
      negotiationStrategy: aiResponse.negotiationStrategy,
      potentialSavings: aiResponse.potentialSavings
    };
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    // Fallback para análise simples
    const cheapest = responses.reduce((prev, curr) => 
      prev.total_amount < curr.total_amount ? prev : curr
    );
    
    return {
      bestResponse: cheapest,
      analysisReason: "Selecionada automaticamente a proposta com menor valor",
      negotiationStrategy: {
        targetDiscount: 5,
        maxDiscount: 10,
        approach: "volume",
        talking_points: ["Considerando o volume do pedido", "Relacionamento de longo prazo"]
      },
      potentialSavings: cheapest.total_amount * 0.05
    };
  }
}

async function startNegotiation(negotiationId: string) {
  console.log(`Starting negotiation: ${negotiationId}`);
  
  // Buscar dados da negociação
  const { data: negotiation } = await supabase
    .from('ai_negotiations')
    .select(`
      *,
      quotes(*),
      quote_responses!selected_response_id(*)
    `)
    .eq('id', negotiationId)
    .single();

  if (!negotiation) {
    throw new Error('Negotiation not found');
  }

  // Buscar dados do fornecedor
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', negotiation.quote_responses.supplier_id)
    .single();

  // Gerar mensagem de negociação
  const negotiationMessage = await generateNegotiationMessage(
    negotiation,
    supplier
  );

  // Simular envio (aqui você integraria com WhatsApp/Email)
  const conversationLog = [
    {
      timestamp: new Date().toISOString(),
      type: 'ai_message',
      content: negotiationMessage,
      channel: 'whatsapp' // ou 'email'
    }
  ];

  // Atualizar negociação
  await supabase
    .from('ai_negotiations')
    .update({
      status: 'negotiating',
      conversation_log: conversationLog
    })
    .eq('id', negotiationId);

  return new Response(JSON.stringify({
    success: true,
    message: negotiationMessage,
    negotiationId
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateNegotiationMessage(negotiation: any, supplier: any): Promise<string> {
  const strategy = negotiation.ai_analysis.negotiationStrategy;
  const targetDiscount = strategy.targetDiscount || 5;
  const originalAmount = negotiation.quote_responses.total_amount;
  const targetAmount = originalAmount * (1 - targetDiscount / 100);

  const prompt = `
Crie uma mensagem de negociação profissional e humanizada para o fornecedor:

CONTEXTO:
- Fornecedor: ${supplier.name}
- Proposta original: R$ ${originalAmount}
- Meta de desconto: ${targetDiscount}%
- Valor alvo: R$ ${targetAmount.toFixed(2)}
- Estratégia: ${strategy.approach}
- Pontos de conversa: ${strategy.talking_points?.join(', ')}

Crie uma mensagem WhatsApp/Email que seja:
- Respeitosa e profissional
- Humanizada (não pareça bot)
- Específica sobre o desconto desejado
- Inclua justificativa válida
- Tom positivo e colaborativo
- Máximo 200 palavras

Responda APENAS com o texto da mensagem, sem aspas ou formatação extra.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um especialista em comunicação empresarial brasileira.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating message:', error);
    return `Olá ${supplier.name}! Analisamos sua excelente proposta de R$ ${originalAmount} e gostaríamos de negociar um valor de R$ ${targetAmount.toFixed(2)} considerando o volume e nossa parceria. Podemos conversar sobre essa possibilidade?`;
  }
}

async function approveNegotiation(negotiationId: string) {
  await supabase
    .from('ai_negotiations')
    .update({
      status: 'approved',
      human_approved: true,
      approved_by: null // Seria preenchido com auth.uid() em uma implementação real
    })
    .eq('id', negotiationId);

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function rejectNegotiation(negotiationId: string) {
  await supabase
    .from('ai_negotiations')
    .update({
      status: 'rejected',
      human_approved: false
    })
    .eq('id', negotiationId);

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}