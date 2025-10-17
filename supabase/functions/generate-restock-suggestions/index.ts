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
    const { supplierId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('supplier_id', supplierId)
      .or(`stock_qty.lt.reorder_point,stock_qty.lt.min_stock_level`);

    if (productsError) {
      throw new Error('Erro ao buscar produtos');
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ success: true, suggestions: [], message: 'Nenhum produto precisa reposição' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const suggestions = products.map(product => {
      const urgency = product.stock_qty <= (product.min_stock_level || 0) ? 'high' : 
                     product.stock_qty <= (product.reorder_point || 0) ? 'medium' : 'low';
      
      const suggestedQuantity = product.reorder_quantity || 
                               (product.max_stock_level ? product.max_stock_level - product.stock_qty : product.stock_qty * 2);

      return {
        product_id: product.id,
        product_name: product.name,
        product_code: product.code,
        current_stock: product.stock_qty,
        min_stock: product.min_stock_level,
        reorder_point: product.reorder_point,
        suggested_quantity: Math.max(1, Math.ceil(suggestedQuantity)),
        urgency,
        estimated_cost: product.average_cost ? product.average_cost * suggestedQuantity : null,
        lead_time_days: product.lead_time_days
      };
    });

    suggestions.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });

    for (const suggestion of suggestions.filter(s => s.urgency === 'high')) {
      await supabase.from('stock_alerts').insert({
        product_id: suggestion.product_id,
        supplier_id: supplierId,
        alert_type: 'low_stock',
        severity: 'high',
        message: `Estoque crítico: ${suggestion.product_name} (${suggestion.current_stock} unidades)`,
        details: { suggestion }
      });
    }

    return new Response(
      JSON.stringify({ success: true, suggestions, total: suggestions.length }),
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
