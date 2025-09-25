import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FINANCIAL-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing Stripe configuration");
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Verify webhook signature
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
    } catch (err: any) {
      logStep("Webhook signature verification failed", { error: err?.message || err });
      return new Response(`Webhook Error: ${err?.message || err}`, { status: 400 });
    }

    logStep("Processing event", { type: event.type, id: event.id });

    switch (event.type) {
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Find invoice in database
        const { data: dbInvoice, error } = await supabaseClient
          .from('invoices')
          .select('*')
          .eq('stripe_invoice_id', invoice.id)
          .single();

        if (error || !dbInvoice) {
          logStep("Invoice not found in database", { stripeInvoiceId: invoice.id });
          break;
        }

        // Update invoice status
        await supabaseClient
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('id', dbInvoice.id);

        // Ensure subscription is active
        await supabaseClient
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('id', dbInvoice.subscription_id);

        logStep("Invoice payment processed", { 
          invoiceId: dbInvoice.id,
          amount: dbInvoice.amount 
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Find invoice in database
        const { data: dbInvoice, error } = await supabaseClient
          .from('invoices')
          .select('*')
          .eq('stripe_invoice_id', invoice.id)
          .single();

        if (error || !dbInvoice) {
          logStep("Invoice not found in database", { stripeInvoiceId: invoice.id });
          break;
        }

        // Update invoice status
        await supabaseClient
          .from('invoices')
          .update({ status: 'past_due' })
          .eq('id', dbInvoice.id);

        logStep("Invoice payment failed", { 
          invoiceId: dbInvoice.id 
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find subscription in database
        const { data: dbSubscription, error } = await supabaseClient
          .from('subscriptions')
          .select('*')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (error || !dbSubscription) {
          logStep("Subscription not found in database", { stripeSubscriptionId: subscription.id });
          break;
        }

        let status = 'active';
        if (subscription.status === 'canceled') status = 'cancelled';
        else if (subscription.status === 'past_due') status = 'past_due';
        else if (subscription.status === 'unpaid') status = 'suspended';

        // Update subscription
        await supabaseClient
          .from('subscriptions')
          .update({
            status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end
          })
          .eq('id', dbSubscription.id);

        logStep("Subscription updated", { 
          subscriptionId: dbSubscription.id,
          status 
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find subscription in database
        const { data: dbSubscription, error } = await supabaseClient
          .from('subscriptions')
          .select('*')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (error || !dbSubscription) {
          logStep("Subscription not found in database", { stripeSubscriptionId: subscription.id });
          break;
        }

        // Update subscription status
        await supabaseClient
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          })
          .eq('id', dbSubscription.id);

        logStep("Subscription cancelled", { 
          subscriptionId: dbSubscription.id 
        });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    logStep("ERROR in webhook processing", { message: error?.message || error });
    return new Response(
      JSON.stringify({ error: error?.message || error }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});