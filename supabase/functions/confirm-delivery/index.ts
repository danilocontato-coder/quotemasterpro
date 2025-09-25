import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { confirmation_code } = await req.json();

    if (!confirmation_code) {
      return new Response(
        JSON.stringify({ error: 'Código de confirmação é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar código de confirmação válido
    const { data: confirmationData, error: confirmationError } = await supabase
      .from('delivery_confirmations')
      .select(`
        *,
        deliveries!inner(
          id,
          client_id,
          supplier_id,
          status,
          payments!inner(id, status, amount)
        )
      `)
      .eq('confirmation_code', confirmation_code)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (confirmationError || !confirmationData) {
      return new Response(
        JSON.stringify({ error: 'Código inválido, expirado ou já utilizado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se usuário tem permissão (cliente da entrega)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.client_id !== confirmationData.deliveries.client_id) {
      return new Response(
        JSON.stringify({ error: 'Você não tem permissão para confirmar esta entrega' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar código como usado
    const { error: updateCodeError } = await supabase
      .from('delivery_confirmations')
      .update({
        is_used: true,
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.id
      })
      .eq('id', confirmationData.id);

    if (updateCodeError) {
      throw updateCodeError;
    }

    // Atualizar status da entrega para delivered
    const { error: updateDeliveryError } = await supabase
      .from('deliveries')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString()
      })
      .eq('id', confirmationData.delivery_id);

    if (updateDeliveryError) {
      throw updateDeliveryError;
    }

    // Liberar pagamento (mover de escrow para completed)
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('quote_id', confirmationData.deliveries.quote_id)
      .eq('status', 'in_escrow');

    if (updatePaymentError) {
      console.error('Erro ao atualizar pagamento:', updatePaymentError);
    }

    // Atualizar status da cotação para delivered
    const { error: updateQuoteError } = await supabase
      .from('quotes')
      .update({
        status: 'delivered'
      })
      .eq('id', confirmationData.deliveries.quote_id);

    if (updateQuoteError) {
      console.error('Erro ao atualizar cotação:', updateQuoteError);
    }

    // Notificar fornecedor sobre entrega confirmada
    const { error: notificationError } = await supabase.functions.invoke('create-notification', {
      body: {
        user_id: confirmationData.deliveries.supplier_id,
        title: 'Entrega Confirmada',
        message: `O cliente confirmou o recebimento da entrega. Pagamento liberado!`,
        type: 'delivery_confirmed',
        priority: 'high',
        metadata: {
          delivery_id: confirmationData.delivery_id,
          quote_id: confirmationData.deliveries.quote_id,
          payment_amount: confirmationData.deliveries.payments?.amount
        }
      }
    });

    // Log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        action: 'DELIVERY_CONFIRMED',
        entity_type: 'deliveries',
        entity_id: confirmationData.delivery_id,
        user_id: user.id,
        panel_type: 'client',
        details: {
          confirmation_code,
          quote_id: confirmationData.deliveries.quote_id,
          payment_released: true
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Entrega confirmada com sucesso! Pagamento liberado para o fornecedor.',
        delivery_id: confirmationData.delivery_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na confirmação de entrega:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});