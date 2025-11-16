import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, productName, category, currentPrice, averageCost } = await req.json();

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY não configurada');
    }

    const prompt = `Analise o mercado brasileiro para o produto "${productName}" da categoria "${category}". 
    Preço atual: R$ ${currentPrice}
    Custo médio: R$ ${averageCost}
    
    Forneça uma análise de mercado incluindo:
    1. Faixa de preço praticada no mercado (mínimo e máximo)
    2. Preço médio de mercado
    3. Margem de lucro recomendada para este tipo de produto
    4. Sugestão de preço competitivo
    5. Tendências de mercado
    
    Responda em formato JSON com as chaves: market_price_min, market_price_max, market_price_avg, recommended_margin, suggested_price, trends`;

    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de preços e mercado brasileiro. Sempre responda em JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!perplexityResponse.ok) {
      throw new Error(`Perplexity API error: ${perplexityResponse.statusText}`);
    }

    const perplexityData = await perplexityResponse.json();
    const aiResponse = perplexityData.choices[0].message.content;

    let analysis;
    try {
      analysis = JSON.parse(aiResponse);
    } catch {
      analysis = {
        market_price_min: currentPrice * 0.8,
        market_price_max: currentPrice * 1.5,
        market_price_avg: currentPrice * 1.1,
        recommended_margin: 30,
        suggested_price: averageCost * 1.3,
        trends: 'Análise não disponível no formato esperado'
      };
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from('products')
      .update({
        market_price_avg: analysis.market_price_avg,
        competitor_price_min: analysis.market_price_min,
        competitor_price_max: analysis.market_price_max,
        suggested_price: analysis.suggested_price,
        profit_margin: analysis.recommended_margin,
        ai_analysis: {
          pricing: analysis,
          analyzed_at: new Date().toISOString()
        },
        last_ai_analysis_at: new Date().toISOString()
      })
      .eq('id', productId);

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
