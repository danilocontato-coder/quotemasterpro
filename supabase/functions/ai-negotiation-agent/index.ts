import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { resolveEvolutionConfig, normalizePhone, sendEvolutionWhatsApp } from '../_shared/evolution.ts';

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

  // Encontrar a melhor proposta (menor valor) - usar propostas reais dos fornecedores
  const bestResponse = quote.quote_responses.reduce((best: any, current: any) => 
    current.total_amount < best.total_amount ? current : best
  );

  // Calcular preço médio do mercado baseado nas propostas dos fornecedores
  const averagePrice = quote.quote_responses.reduce((sum: number, resp: any) => 
    sum + resp.total_amount, 0) / quote.quote_responses.length;

  // Determinar se vale a pena negociar - usar valor da melhor proposta como base
  const marketPrice = bestResponse.total_amount;
  const negotiationPotential = ((marketPrice - averagePrice * 0.85) / marketPrice) * 100;
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

  // Criar análise da IA baseada nas propostas reais dos fornecedores
  const analysisPrompt = `
Você é um especialista em negociações comerciais brasileiras. Analise esta situação:

Cotação: ${quote.title || quote.description}

Itens solicitados:
${quote.quote_items.map((item: any) => 
  `- ${item.product_name} (Qtd: ${item.quantity})`
).join('\n')}

Propostas recebidas dos fornecedores:
${quote.quote_responses.map((resp: any) => 
  `- ${resp.supplier_name}: R$ ${resp.total_amount.toLocaleString('pt-BR')}`
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
          original_amount: bestResponse.total_amount, // Usar valor da melhor proposta
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
  console.log(`Iniciando negociação via WhatsApp: ${negotiationId}`);
  
  // Buscar negociação primeiro
  const { data: negotiation, error: negotiationError } = await supabase
    .from('ai_negotiations')
    .select('*')
    .eq('id', negotiationId)
    .single();

  if (negotiationError || !negotiation) {
    console.error('Erro ao buscar negociação:', negotiationError);
    throw new Error('Negociação não encontrada');
  }

  // Buscar cotação relacionada
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', negotiation.quote_id)
    .single();

  if (quoteError || !quote) {
    console.error('Erro ao buscar cotação:', quoteError);
    throw new Error('Cotação relacionada não encontrada');
  }

  // Buscar a melhor resposta se tiver selected_response_id
  let selectedResponse = null;
  let supplier = null;

  if (negotiation.selected_response_id) {
    const { data: response, error: responseError } = await supabase
      .from('quote_responses')
      .select('*')
      .eq('id', negotiation.selected_response_id)
      .single();

    if (!responseError && response) {
      selectedResponse = response;
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('id, name, phone, whatsapp')
        .eq('id', response.supplier_id)
        .maybeSingle();
      supplier = supplierData;
    }
  }

  // Se não tem selected_response_id, buscar a melhor resposta (menor valor)
  if (!selectedResponse) {
    const { data: responses, error: responsesError } = await supabase
      .from('quote_responses')
      .select('*')
      .eq('quote_id', negotiation.quote_id)
      .order('total_amount', { ascending: true });

    if (responsesError || !responses || responses.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhuma proposta encontrada para a cotação' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    selectedResponse = responses[0];

    const { data: supplierData } = await supabase
      .from('suppliers')
      .select('id, name, phone, whatsapp')
      .eq('id', selectedResponse.supplier_id)
      .maybeSingle();
    supplier = supplierData;

    await supabase
      .from('ai_negotiations')
      .update({ 
        selected_response_id: selectedResponse.id,
        original_amount: selectedResponse.total_amount
      })
      .eq('id', negotiationId);
  }

  if (!supplier || (!supplier.whatsapp && !supplier.phone)) {
    return new Response(
      JSON.stringify({ success: false, error: 'WhatsApp do fornecedor não encontrado' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supplierPhone = supplier.whatsapp || supplier.phone;
  const originalAmount = negotiation.original_amount || selectedResponse.total_amount;

  const targetDiscount = negotiation.negotiation_strategy?.targetDiscount || 8;
  const proposedAmount = originalAmount * (1 - targetDiscount / 100);

  // Gerar mensagem de negociação usando GPT-5
  const negotiationPrompt = `
Você é um assistente de compras profissional iniciando uma negociação via WhatsApp.

Contexto:
- Cotação: ${quote.title}
- Fornecedor: ${supplier.name}
- Proposta atual: R$ ${originalAmount.toLocaleString('pt-BR')}
- Valor proposto: R$ ${proposedAmount.toLocaleString('pt-BR')}
- Estratégia: ${negotiation.negotiation_strategy?.strategy || 'Negociação colaborativa'}
- Razão: ${negotiation.negotiation_strategy?.reason || 'Buscar melhor preço'}

Escreva UMA mensagem WhatsApp profissional em português:
- Máximo 300 caracteres
- Tom amigável mas profissional
- Mencione parceria de longo prazo
- Proponha o valor específico
- Use emojis apropriados

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
        max_completion_tokens: 400,
      }),
    });

    const messageData = await messageResponse.json();
    const aiMessage = messageData.choices[0].message.content.trim();

    // Normalizar telefone uma única vez
    const normalizedPhone = normalizePhone(supplierPhone);


    // Resolver config Evolution: cliente primeiro, depois global
    const clientCfg = await resolveEvolutionConfig(supabase, quote.client_id, false);
    const globalCfg = await resolveEvolutionConfig(supabase, null, true);
    const attempts: Array<{scope: string, apiUrl: string | null, error?: string}> = [];

    // Tentar envio com config do cliente primeiro
    let usedCfg = clientCfg.apiUrl && clientCfg.token ? clientCfg : null;
    let result: any = { success: false };

    if (usedCfg) {
      attempts.push({ scope: clientCfg.scope, apiUrl: clientCfg.apiUrl });
      result = await sendEvolutionWhatsApp(usedCfg, normalizedPhone, aiMessage);
      if (!result.success) attempts[attempts.length - 1].error = result.error;
    }

    // Se falhar, tentar com config global (SuperAdmin)
    if (!result.success && globalCfg.apiUrl && globalCfg.token) {
      usedCfg = globalCfg;
      attempts.push({ scope: globalCfg.scope, apiUrl: globalCfg.apiUrl });
      const retry = await sendEvolutionWhatsApp(globalCfg, normalizedPhone, aiMessage);
      result = retry;
      if (!result.success) attempts[attempts.length - 1].error = result.error;
    }

    // Se ainda falhar: simular apenas se não houver nenhuma config válida
    if (!result.success) {
      if (!clientCfg.apiUrl && !globalCfg.apiUrl) {
        const simulatedMessageId = `sim_${Date.now()}`;
        const conversationLog = [
          { role: 'ai', message: aiMessage, timestamp: new Date().toISOString(), channel: 'whatsapp_simulated', messageId: simulatedMessageId, phone: normalizedPhone, supplier_name: supplier.name, deliveryStatus: 'simulated' }
        ];
        const { data: updatedNegotiation } = await supabase
          .from('ai_negotiations')
          .update({ status: 'negotiating', conversation_log: conversationLog, updated_at: new Date().toISOString() })
          .eq('id', negotiationId)
          .select()
          .single();
        return new Response(JSON.stringify({ success: true, negotiation: updatedNegotiation, whatsapp_sent: true, simulated: true, message_sent: aiMessage, messageId: simulatedMessageId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao enviar WhatsApp', debug: { supplier_name: supplier.name, phone: normalizedPhone, attempts, tried_endpoints: result.tried_endpoints || [] } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ WhatsApp enviado com sucesso para ${supplier.name}:`, result.messageId);


    // Criar log de conversa inicial com mais detalhes
    const conversationLog = [
      {
        role: 'ai',
        message: aiMessage,
        timestamp: new Date().toISOString(),
        channel: 'whatsapp',
        messageId: whatsappResult.messageId,
        phone: normalizedPhone,
        supplier_name: supplier.name,
        deliveryStatus: 'sent'
      }
    ];

    // Atualizar negociação para status 'negotiating'
    const { data: updatedNegotiation, error: updateError } = await supabase
      .from('ai_negotiations')
      .update({
        status: 'negotiating',
        conversation_log: conversationLog,
        updated_at: new Date().toISOString()
      })
      .eq('id', negotiationId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Erro ao atualizar negociação');
    }

    console.log(`Negociação ${negotiationId} iniciada via WhatsApp. Aguardando resposta do fornecedor.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        negotiation: updatedNegotiation,
        whatsapp_sent: true,
        supplier_name: supplier.name,
        message_sent: aiMessage,
        messageId: whatsappResult.messageId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (apiError) {
    console.error('Erro na negociação via WhatsApp:', apiError);
    return new Response(
      JSON.stringify({ success: false, error: apiError?.message || 'Erro ao realizar negociação' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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