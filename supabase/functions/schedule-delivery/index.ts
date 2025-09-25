import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: Record<string, unknown>) => {
  console.log(`[SCHEDULE-DELIVERY] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    log("Start");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    if (!userData?.user?.id) throw new Error("User not authenticated");
    const user = userData.user;
    log("User authenticated", { userId: user.id });

    const { quote_id, scheduled_date, delivery_address, notes } = await req.json();
    if (!quote_id || !scheduled_date) throw new Error("quote_id and scheduled_date are required");

    // Verificar se existe pagamento in_escrow para esta cotação
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, client_id, supplier_id, status")
      .eq("quote_id", quote_id)
      .eq("status", "in_escrow")
      .single();

    if (paymentError || !payment) {
      throw new Error("No payment in escrow found for this quote");
    }

    // Verificar se usuário é o fornecedor da cotação
    const { data: profile } = await supabase
      .from("profiles")
      .select("supplier_id")
      .eq("id", user.id)
      .single();

    if (!profile?.supplier_id || profile.supplier_id !== payment.supplier_id) {
      throw new Error("Only the assigned supplier can schedule delivery");
    }

    // Criar agendamento de entrega
    const { data: delivery, error: deliveryError } = await supabase
      .from("deliveries")
      .insert({
        payment_id: payment.id,
        quote_id: quote_id,
        client_id: payment.client_id,
        supplier_id: payment.supplier_id,
        scheduled_date: scheduled_date,
        delivery_address: delivery_address,
        notes: notes,
        status: "scheduled"
      })
      .select()
      .single();

    if (deliveryError) throw deliveryError;

    // Atualizar status da cotação para 'delivering'
    await supabase
      .from("quotes")
      .update({
        status: "delivering",
        updated_at: new Date().toISOString()
      })
      .eq("id", quote_id);

    // Notificar cliente sobre agendamento
    await supabase.functions.invoke('create-notification', {
      body: {
        user_ids: [payment.client_id],
        title: 'Entrega Agendada',
        message: `A entrega da cotação #${quote_id} foi agendada para ${new Date(scheduled_date).toLocaleDateString('pt-BR')}.`,
        type: 'delivery_scheduled',
        priority: 'normal',
        metadata: {
          delivery_id: delivery.id,
          quote_id: quote_id,
          scheduled_date: scheduled_date,
          action_url: '/quotes'
        }
      }
    });

    // Log de auditoria
    await supabase
      .from("audit_logs")
      .insert({
        user_id: user.id,
        action: "DELIVERY_SCHEDULED",
        entity_type: "deliveries",
        entity_id: delivery.id,
        panel_type: "supplier",
        details: {
          quote_id: quote_id,
          scheduled_date: scheduled_date,
          delivery_address: delivery_address
        }
      });

    log("Delivery scheduled successfully", { deliveryId: delivery.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        delivery_id: delivery.id,
        message: "Delivery scheduled successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});