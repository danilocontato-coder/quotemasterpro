import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { resolveEvolutionConfig, normalizePhone, sendEvolutionWhatsApp } from '../_shared/evolution.ts';
import { trackAIUsage } from '../_shared/track-ai-usage.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

const createSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, quoteId, negotiationId } = await req.json();
    const sb = createSupabaseClient();
    console.log(`AI Negotiation Agent - Action: ${action}, Quote: ${quoteId}, Negotiation: ${negotiationId}`);

    switch (action) {
      case 'analyze':
        return await analyzeQuote(sb, quoteId);
      case 'negotiate':
        return await startNegotiation(sb, negotiationId);
      case 'approve':
        return await approveNegotiation(sb, negotiationId);
      case 'reject':
        return await rejectNegotiation(sb, negotiationId);
      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Erro na edge function AI Negotiation:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro inesperado' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function analyzeQuote(sb: any, quoteId: string) {
  console.log(`Analisando cotação: ${quoteId}`);
  
  // Buscar chave da API do OpenAI com fallback em múltiplas tabelas
  let openAIApiKey = '';
  
  // Tentar primeiro em ai_negotiation_settings
  const { data: aiSettings } = await sb
    .from('ai_negotiation_settings')
    .select('setting_value')
    .eq('setting_key', 'openai_api_key')
    .eq('active', true)
    .maybeSingle();
  
  if (aiSettings?.setting_value) {
    const val = aiSettings.setting_value;
    openAIApiKey = typeof val === 'string' ? val : (val?.value || val?.key || '');
  }
  
  // Fallback para system_settings se não encontrou
  if (!openAIApiKey) {
    const { data: sysSettings } = await sb
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'openai_api_key')
      .maybeSingle();
    
    if (sysSettings?.setting_value) {
      const val = sysSettings.setting_value;
      openAIApiKey = typeof val === 'string' ? val : (val?.value || val?.key || '');
    }
  }
  
  console.log(`[analyzeQuote] OpenAI API Key ${openAIApiKey ? 'encontrada' : 'NÃO encontrada'}`);
  
  // Buscar cotação, itens e respostas
  const { data: quote, error: quoteError } = await sb
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

// Buscar configurações de IA com fallback seguro
let usePerplexity = false;
let model = 'gpt-5-2025-08-07';
try {
  // Tenta tabela canônica do projeto
  const { data: s1 } = await sb
    .from('ai_negotiation_settings')
    .select('setting_value')
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  if (s1?.setting_value) {
    usePerplexity = s1.setting_value?.negotiation_provider === 'perplexity';
    model = usePerplexity
      ? (s1.setting_value?.perplexity_model || 'llama-3.1-sonar-large-128k-online')
      : (s1.setting_value?.openai_model || 'gpt-5-2025-08-07');
  } else {
    // Fallback para tabela antiga, se existir
    const { data: s2 } = await sb
      .from('ai_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (s2) {
      usePerplexity = s2?.negotiation_provider === 'perplexity';
      model = usePerplexity
        ? (s2?.perplexity_model || 'llama-3.1-sonar-large-128k-online')
        : (s2?.openai_model || 'gpt-5-2025-08-07');
    }
  }
} catch (_) {
  // Mantém defaults
}

const apiKey = usePerplexity ? perplexityApiKey : openAIApiKey;
if (!apiKey) {
  return new Response(
    JSON.stringify({ error: `Chave da API ${usePerplexity ? 'Perplexity' : 'OpenAI'} não configurada` }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
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
    
    // Rastrear uso de tokens (análise)
    if (analysisData.usage && quote.client_id) {
      trackAIUsage({
        supabaseUrl,
        supabaseKey: supabaseServiceKey,
        clientId: quote.client_id,
        provider: usePerplexity ? 'perplexity' : 'openai',
        model,
        feature: 'negotiation',
        promptTokens: analysisData.usage.prompt_tokens || 0,
        completionTokens: analysisData.usage.completion_tokens || 0,
        totalTokens: analysisData.usage.total_tokens || 0,
        quoteId: quoteId,
        requestId: analysisData.id,
        metadata: {
          action: 'analyze',
          negotiation_potential: negotiationPotential
        }
      }).catch(err => console.error('[track-ai-usage] Erro ao rastrear análise:', err));
    }
    
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

    // Criar ou atualizar registro de negociação (evitar violar constraint de status)
    // Verifica se já existe negociação para esta cotação
    const { data: existing } = await sb
      .from('ai_negotiations')
      .select('id')
      .eq('quote_id', quoteId)
      .limit(1)
      .maybeSingle();

    const payload = {
      quote_id: quoteId,
      selected_response_id: bestResponse.id,
      original_amount: bestResponse.total_amount && bestResponse.total_amount > 0 ? bestResponse.total_amount : averagePrice,
      ai_analysis: aiAnalysis,
      negotiation_strategy: {
        reason: aiAnalysis.reason,
        strategy: aiAnalysis.strategy,
        targetDiscount: aiAnalysis.targetDiscount,
        marketAverage: averagePrice,
        negotiationPotential: negotiationPotential,
        provider: usePerplexity ? 'perplexity' : 'openai',
        model: model,
        viable: shouldNegotiate
      },
      status: 'analyzed'
    };

    let negotiation;
    let negotiationError;

    if (existing?.id) {
      const upd = await sb
        .from('ai_negotiations')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      negotiation = upd.data;
      negotiationError = upd.error;
    } else {
      const ins = await sb
        .from('ai_negotiations')
        .insert(payload)
        .select()
        .single();
      negotiation = ins.data;
      negotiationError = ins.error;
    }


    if (negotiationError) {
      console.error('Erro ao criar registro de negociação (Supabase):', negotiationError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar registro de negociação', details: negotiationError?.message || negotiationError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

async function startNegotiation(sb: any, negotiationId: string) {
  console.log(`Iniciando negociação via WhatsApp: ${negotiationId}`);
  
  // Buscar chave da API do OpenAI com fallback em múltiplas tabelas
  let openAIApiKey = '';
  
  // Tentar primeiro em ai_negotiation_settings
  const { data: aiSettings } = await sb
    .from('ai_negotiation_settings')
    .select('setting_value')
    .eq('setting_key', 'openai_api_key')
    .eq('active', true)
    .maybeSingle();
  
  if (aiSettings?.setting_value) {
    const val = aiSettings.setting_value;
    openAIApiKey = typeof val === 'string' ? val : (val?.value || val?.key || '');
  }
  
  // Fallback para system_settings se não encontrou
  if (!openAIApiKey) {
    const { data: sysSettings } = await sb
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'openai_api_key')
      .maybeSingle();
    
    if (sysSettings?.setting_value) {
      const val = sysSettings.setting_value;
      openAIApiKey = typeof val === 'string' ? val : (val?.value || val?.key || '');
    }
  }
  
  console.log(`[startNegotiation] OpenAI API Key ${openAIApiKey ? 'encontrada' : 'NÃO encontrada'}`);
  
  // Buscar negociação primeiro
  const { data: negotiation, error: negotiationError } = await sb
    .from('ai_negotiations')
    .select('*')
    .eq('id', negotiationId)
    .single();

  if (negotiationError || !negotiation) {
    console.error('Erro ao buscar negociação:', negotiationError);
    throw new Error('Negociação não encontrada');
  }

// Buscar cotação relacionada
  const { data: quote, error: quoteError } = await sb
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
    const { data: response, error: responseError } = await sb
      .from('quote_responses')
      .select('*')
      .eq('id', negotiation.selected_response_id)
      .single();

    if (!responseError && response) {
      selectedResponse = response;
      const { data: supplierData } = await sb
        .from('suppliers')
        .select('id, name, phone, whatsapp')
        .eq('id', response.supplier_id)
        .maybeSingle();
      supplier = supplierData;
    }
  }

  // Se não tem selected_response_id, buscar a melhor resposta (menor valor)
if (!selectedResponse) {
    const { data: responses, error: responsesError } = await sb
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

const { data: supplierData } = await sb
      .from('suppliers')
      .select('id, name, phone, whatsapp')
      .eq('id', selectedResponse.supplier_id)
      .maybeSingle();
    supplier = supplierData;

    await sb
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

    // Rastrear uso de tokens (negociação)
    if (messageData.usage && quote.client_id) {
      trackAIUsage({
        supabaseUrl,
        supabaseKey: supabaseServiceKey,
        clientId: quote.client_id,
        provider: 'openai',
        model: messageData.model || 'gpt-5-2025-08-07',
        feature: 'negotiation',
        promptTokens: messageData.usage.prompt_tokens || 0,
        completionTokens: messageData.usage.completion_tokens || 0,
        totalTokens: messageData.usage.total_tokens || 0,
        quoteId: negotiation.quote_id,
        requestId: messageData.id,
        metadata: {
          action: 'negotiate',
          supplier_name: supplier.name,
          target_discount: targetDiscount
        }
      }).catch(err => console.error('[track-ai-usage] Erro ao rastrear negociação:', err));
    }

    // Normalizar telefone uma única vez
    const normalizedPhone = normalizePhone(supplierPhone);


    // Resolver config Evolution: cliente primeiro, depois global
    const clientCfg = await resolveEvolutionConfig(sb, quote.client_id, false);
    const globalCfg = await resolveEvolutionConfig(sb, null, true);
    const attempts: Array<{ scope: string, apiUrl: string | null, hasToken: boolean, hasInstance: boolean, error?: string, preflight?: { ok: boolean, status?: number } }> = [];

    // Selecionar candidatos na ordem cliente -> global e só tentar envios reais com config completa
    const candidates = [clientCfg, globalCfg];

    let result: any = { success: false };

    for (const cfg of candidates) {
      if (!cfg || !cfg.apiUrl) continue;
      const hasToken = !!cfg.token;
      const hasInstance = !!cfg.instance;
      attempts.push({ scope: cfg.scope, apiUrl: cfg.apiUrl || null, hasToken, hasInstance });

      if (!(hasToken && hasInstance)) {
        attempts[attempts.length - 1].error = 'Config incompleta (token/instance ausentes)';
        continue;
      }

      // Preflight igual ao módulo "Enviar para fornecedores" (best effort - não bloqueante)
      try {
        const base = cfg.apiUrl.replace(/\/+$/, '');
        const bases = Array.from(new Set([base, `${base}/api`]));
        const headerVariants: Record<string, string>[] = [
          { apikey: cfg.token },
          { Authorization: `Bearer ${cfg.token}` },
        ];
        let preflightOk = false;
        let lastStatus = 0;
        for (const b of bases) {
          for (const headers of headerVariants) {
            const cs = await fetch(`${b}/instance/connectionState/${encodeURIComponent(cfg.instance as string)}`, { headers });
            lastStatus = cs.status;
            if (cs.ok) { preflightOk = true; break; }
          }
          if (preflightOk) break;
        }
        attempts[attempts.length - 1].preflight = { ok: preflightOk, status: lastStatus };
        if (!preflightOk) {
          attempts[attempts.length - 1].error = `Preflight falhou (status ${lastStatus}) - prosseguindo com envio`;
        }
      } catch (e: any) {
        attempts[attempts.length - 1].error = `Preflight erro: ${e?.message || String(e)} - prosseguindo com envio`;
      }

      const sent = await sendEvolutionWhatsApp(cfg, normalizedPhone, aiMessage);
      result = sent;
      if (sent.success) break;
      attempts[attempts.length - 1].error = sent.error;
    }

    // Envio deve ser sempre real: sem simulação
    if (!result.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Falha ao enviar WhatsApp', 
          debug: { 
            supplier_name: supplier.name, 
            phone: normalizedPhone, 
            attempts, 
            config: { 
              client: { apiUrl: clientCfg.apiUrl || null, hasToken: !!clientCfg.token, hasInstance: !!clientCfg.instance }, 
              global: { apiUrl: globalCfg.apiUrl || null, hasToken: !!globalCfg.token, hasInstance: !!globalCfg.instance } 
            } 
          }, 
          tried_endpoints: result.tried_endpoints || [] 
        }),
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
        messageId: result.messageId,
        phone: normalizedPhone,
        supplier_name: supplier.name,
        deliveryStatus: 'sent'
      }
    ];

    // Atualizar negociação para status 'awaiting_approval'
    const { data: updatedNegotiation, error: updateError } = await sb
      .from('ai_negotiations')
      .update({
        status: 'awaiting_approval',
        conversation_log: conversationLog,
        updated_at: new Date().toISOString()
      })
      .eq('id', negotiationId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Erro ao atualizar negociação');
    }

    // Atualizar status da cotação para aguardar aprovação da IA
    await sb
      .from('quotes')
      .update({ 
        status: 'awaiting_ai_approval',
        updated_at: new Date().toISOString()
      })
      .eq('id', updatedNegotiation.quote_id);

    console.log(`Negociação ${negotiationId} iniciada via WhatsApp. Aguardando resposta do fornecedor.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        negotiation: updatedNegotiation,
        whatsapp_sent: true,
        supplier_name: supplier.name,
        message_sent: aiMessage,
        messageId: result.messageId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (apiError) {
    console.error('Erro na negociação via WhatsApp:', apiError);
    return new Response(
      JSON.stringify({ success: false, error: (apiError as any)?.message || 'Erro ao realizar negociação' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function approveNegotiation(sb: any, negotiationId: string) {
  const { data, error } = await sb
    .from('ai_negotiations')
    .update({
      status: 'approved',
      human_approved: true,
      approved_by: 'current_user' // TODO: capturar do JWT
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

async function rejectNegotiation(sb: any, negotiationId: string) {
  const { data, error } = await sb
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