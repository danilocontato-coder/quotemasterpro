import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { quote_id, client_id, supplier_id, amount } = await req.json()

    // Buscar informações da cotação para obter o supplier_id se não foi fornecido
    let finalSupplierId = supplier_id;
    
    if (!finalSupplierId) {
      // Buscar o supplier_id da cotação ou da resposta aprovada
      const { data: quote } = await supabase
        .from('quotes')
        .select('supplier_id')
        .eq('id', quote_id)
        .single()
      
      if (quote?.supplier_id) {
        finalSupplierId = quote.supplier_id;
      } else {
        // Se não tem supplier_id na cotação, buscar na resposta mais recente
        const { data: response } = await supabase
          .from('quote_responses')
          .select('supplier_id')
          .eq('quote_id', quote_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        
        if (response?.supplier_id) {
          finalSupplierId = response.supplier_id;
        }
      }
    }

    // ✅ CORREÇÃO: Buscar valor correto da resposta aprovada (items + frete)
    let finalAmount = amount; // Fallback
    
    if (quote_id) {
      const { data: approvedResponse } = await supabase
        .from('quote_responses')
        .select('total_amount, shipping_cost, items')
        .eq('quote_id', quote_id)
        .eq('status', 'approved')
        .maybeSingle();

      if (approvedResponse) {
        // Recalcular: somar itens + frete se total_amount não incluir
        const itemsTotal = Array.isArray(approvedResponse.items) 
          ? approvedResponse.items.reduce((sum, item) => sum + (item.total || 0), 0)
          : 0;
        
        const shipping = approvedResponse.shipping_cost || 0;
        const calculatedTotal = itemsTotal + shipping;
        
        // Se total_amount da response já estiver correto (inclui frete), usar ele
        // Senão, usar o valor calculado
        finalAmount = approvedResponse.total_amount || calculatedTotal;
        
        console.log('💰 [CREATE-AUTOMATIC-PAYMENT] Valor recalculado:', {
          original_amount: amount,
          items_total: itemsTotal,
          shipping_cost: shipping,
          response_total_amount: approvedResponse.total_amount,
          calculated_amount: calculatedTotal,
          final_amount: finalAmount
        });
      }
    }
    
    // Validate required fields
    if (!quote_id || !client_id || !finalAmount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: quote_id, client_id, amount' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if payment already exists for this quote
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('quote_id', quote_id)
      .maybeSingle()

    if (existingPayment) {
      return new Response(
        JSON.stringify({ message: 'Payment already exists for this quote', payment_id: existingPayment.id }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // O ID será gerado automaticamente pelo trigger
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        quote_id,
        client_id,
        supplier_id: finalSupplierId || null,
        amount: finalAmount, // ✅ Usar valor recalculado
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating payment:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create payment' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        action: 'PAYMENT_AUTO_CREATED',
        entity_type: 'payments',
        entity_id: payment.id,
        panel_type: 'system',
        details: {
          quote_id,
          amount,
          trigger: 'quote_approved'
        }
      })

    console.log(`Automatic payment created: ${payment.id} for quote: ${quote_id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment_id: payment.id,
        message: 'Automatic payment created successfully'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})