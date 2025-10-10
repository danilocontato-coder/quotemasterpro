import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

interface TrackAIUsageParams {
  supabaseUrl: string;
  supabaseKey: string;
  clientId: string;
  provider: 'openai' | 'perplexity';
  model: string;
  feature: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  quoteId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export async function trackAIUsage(params: TrackAIUsageParams) {
  const {
    supabaseUrl,
    supabaseKey,
    clientId,
    provider,
    model,
    feature,
    promptTokens,
    completionTokens,
    totalTokens,
    quoteId,
    requestId,
    metadata
  } = params;

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Buscar preço do modelo
    const { data: pricing, error: pricingError } = await supabase
      .from('ai_model_pricing')
      .select('*')
      .eq('provider', provider)
      .eq('model', model)
      .eq('active', true)
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pricingError) {
      console.error('[track-ai-usage] Erro ao buscar preços:', pricingError);
    }

    let costUsd = 0;
    if (pricing) {
      costUsd = (promptTokens / 1000 * pricing.prompt_price_per_1k) + 
                (completionTokens / 1000 * pricing.completion_price_per_1k);
    } else {
      console.warn(`[track-ai-usage] Preço não encontrado para ${provider}/${model}`);
    }

    // Inserir registro
    const { error: insertError } = await supabase
      .from('ai_token_usage')
      .insert({
        client_id: clientId,
        provider,
        model,
        feature,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        cost_usd: costUsd,
        quote_id: quoteId,
        request_id: requestId,
        metadata: metadata || {}
      });

    if (insertError) {
      console.error('[track-ai-usage] Erro ao inserir registro:', insertError);
      return { success: false, error: insertError };
    }

    console.log(`✅ [track-ai-usage] ${feature} - ${provider}/${model} - ${totalTokens} tokens - $${costUsd.toFixed(6)}`);
    return { success: true, costUsd };

  } catch (error) {
    console.error('[track-ai-usage] Erro inesperado:', error);
    return { success: false, error };
  }
}
