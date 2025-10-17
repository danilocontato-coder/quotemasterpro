import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error('Produto não encontrado');
    }

    const { data: batches } = await supabase
      .from('product_batches')
      .select('*')
      .eq('product_id', productId)
      .order('expiry_date', { ascending: true });

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY não configurada');
    }

    const prompt = `Analise a gestão de estoque para:
    Produto: ${product.name}
    Estoque atual: ${product.stock_qty} unidades
    Estoque mínimo: ${product.min_stock_level || 'não definido'}
    Ponto de reposição: ${product.reorder_point || 'não definido'}
    Lead time: ${product.lead_time_days || 'não definido'} dias
    Lotes com validade próxima: ${batches?.filter(b => b.expiry_date).length || 0}
    
    Forneça recomendações sobre:
    1. Nível ótimo de estoque mínimo
    2. Ponto ideal de reposição
    3. Quantidade sugerida para pedidos
    4. Alerta sobre lotes próximos ao vencimento
    5. Estratégia de rotação (FIFO/FEFO)
    
    Responda em JSON com: min_stock_recommended, reorder_point_recommended, reorder_quantity_recommended, expiry_alerts, rotation_strategy, recommendations`;

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
            content: 'Você é um especialista em gestão de estoque e logística. Sempre responda em JSON válido.'
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
        min_stock_recommended: product.stock_qty * 0.3,
        reorder_point_recommended: product.stock_qty * 0.5,
        reorder_quantity_recommended: product.stock_qty * 0.7,
        expiry_alerts: [],
        rotation_strategy: 'FEFO',
        recommendations: ['Configure parâmetros de estoque para análise mais precisa']
      };
    }

    await supabase
      .from('products')
      .update({
        min_stock_level: analysis.min_stock_recommended,
        reorder_point: analysis.reorder_point_recommended,
        reorder_quantity: analysis.reorder_quantity_recommended,
        ai_analysis: {
          ...product.ai_analysis,
          inventory: analysis,
          analyzed_at: new Date().toISOString()
        },
        last_ai_analysis_at: new Date().toISOString()
      })
      .eq('id', productId);

    if (analysis.expiry_alerts?.length > 0) {
      for (const alert of analysis.expiry_alerts) {
        await supabase.from('stock_alerts').insert({
          product_id: productId,
          supplier_id: product.supplier_id,
          alert_type: 'expiry_warning',
          severity: 'high',
          message: alert,
          details: { source: 'ai_analysis' }
        });
      }
    }

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
