import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: Record<string, unknown>) => {
  console.log(`[PAYMENT-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
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

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    if (!userData?.user?.id) throw new Error("User not authenticated");
    const user = userData.user;
    log("User authenticated", { userId: user.id });

    const { paymentId } = await req.json();
    if (!paymentId) throw new Error("paymentId is required");

    // Load payment with quote local_code
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, quote_id, client_id, supplier_id, amount, status, quotes(local_code)")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) throw new Error("Payment not found");

    if (Number(payment.amount) <= 0) throw new Error("Payment amount must be greater than zero");

    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Pagamento Cotação #${payment.quotes?.local_code || payment.quote_id}`,
              metadata: {
                payment_id: payment.id,
                quote_id: payment.quote_id,
                client_id: payment.client_id,
                supplier_id: payment.supplier_id || "",
              },
            },
            unit_amount: Math.round(Number(payment.amount) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/payments?success=true&payment_id=${payment.id}`,
      cancel_url: `${origin}/payments?canceled=true&payment_id=${payment.id}`,
      locale: "pt-BR",
      metadata: {
        payment_id: payment.id,
        quote_id: payment.quote_id,
        client_id: payment.client_id,
        supplier_id: payment.supplier_id || "",
      },
    });

    // Save session id
    await supabase
      .from("payments")
      .update({ stripe_session_id: session.id, updated_at: new Date().toISOString() })
      .eq("id", payment.id);

    log("Checkout session created", { sessionId: session.id });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
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
