import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTOMATIC-BILLING] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting automatic billing process");

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get financial settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('financial_settings')
      .select('*')
      .single();

    if (settingsError || !settings?.auto_billing_enabled) {
      logStep("Automatic billing disabled", { settingsError });
      return new Response(
        JSON.stringify({ message: "Automatic billing is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find subscriptions that need billing
    const today = new Date();
    const { data: subscriptions, error: subscriptionsError } = await supabaseClient
      .from('subscriptions')
      .select(`
        *,
        clients:client_id (name, email),
        suppliers:supplier_id (name, email),
        subscription_plans:plan_id (monthly_price, yearly_price)
      `)
      .eq('status', 'active')
      .lte('current_period_end', today.toISOString());

    if (subscriptionsError) throw subscriptionsError;

    logStep("Found subscriptions to bill", { count: subscriptions?.length || 0 });

    let billedCount = 0;

    for (const subscription of subscriptions || []) {
      try {
        // Check if invoice already exists for this period
        const { data: existingInvoice } = await supabaseClient
          .from('invoices')
          .select('id')
          .eq('subscription_id', subscription.id)
          .gte('created_at', subscription.current_period_start)
          .single();

        if (existingInvoice) {
          logStep("Invoice already exists", { subscriptionId: subscription.id });
          continue;
        }

        // Calculate amount based on billing cycle
        const plan = subscription.subscription_plans;
        const amount = subscription.billing_cycle === 'monthly' 
          ? plan.monthly_price 
          : plan.yearly_price;

        // Calculate next period
        const currentPeriodEnd = new Date(subscription.current_period_end);
        const nextPeriodStart = new Date(currentPeriodEnd);
        const nextPeriodEnd = new Date(currentPeriodEnd);
        
        if (subscription.billing_cycle === 'monthly') {
          nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
        } else {
          nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
        }

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabaseClient
          .from('invoices')
          .insert({
            subscription_id: subscription.id,
            client_id: subscription.client_id,
            supplier_id: subscription.supplier_id,
            amount,
            currency: 'BRL',
            status: 'open',
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Update subscription period
        const { error: updateError } = await supabaseClient
          .from('subscriptions')
          .update({
            current_period_start: nextPeriodStart.toISOString(),
            current_period_end: nextPeriodEnd.toISOString()
          })
          .eq('id', subscription.id);

        if (updateError) throw updateError;

        // Try to charge via Stripe if configured
        if (subscription.stripe_customer_id && Deno.env.get("STRIPE_SECRET_KEY")) {
          try {
            const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
              apiVersion: "2023-10-16",
            });

            const paymentIntent = await stripe.paymentIntents.create({
              amount: Math.round(amount * 100), // Convert to cents
              currency: 'brl',
              customer: subscription.stripe_customer_id,
              automatic_payment_methods: { enabled: true },
              metadata: {
                invoice_id: invoice.id,
                subscription_id: subscription.id
              }
            });

            // Update invoice with Stripe payment intent
            await supabaseClient
              .from('invoices')
              .update({
                stripe_invoice_id: paymentIntent.id,
                payment_method: 'stripe'
              })
              .eq('id', invoice.id);

            logStep("Stripe payment intent created", { 
              invoiceId: invoice.id,
              paymentIntentId: paymentIntent.id 
            });

          } catch (stripeError: any) {
            logStep("Stripe charge failed", { 
              error: stripeError?.message || stripeError,
              invoiceId: invoice.id 
            });
          }
        }

        billedCount++;
        logStep("Invoice created successfully", { 
          invoiceId: invoice.id,
          subscriptionId: subscription.id,
          amount 
        });

      } catch (error: any) {
        logStep("Error processing subscription", { 
          subscriptionId: subscription.id,
          error: error?.message || error 
        });
      }
    }

    // Check for overdue invoices and update subscription status
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - (settings.days_before_suspension || 7));

    const { data: overdueInvoices } = await supabaseClient
      .from('invoices')
      .select('subscription_id')
      .eq('status', 'open')
      .lt('due_date', overdueDate.toISOString());

    if (overdueInvoices && settings.auto_suspend_enabled) {
      for (const overdueInvoice of overdueInvoices) {
        // Update invoice status to past_due
        await supabaseClient
          .from('invoices')
          .update({ status: 'past_due' })
          .eq('subscription_id', overdueInvoice.subscription_id)
          .eq('status', 'open');

        // Suspend subscription
        await supabaseClient
          .from('subscriptions')
          .update({ status: 'suspended' })
          .eq('id', overdueInvoice.subscription_id);

        logStep("Subscription suspended for overdue payment", { 
          subscriptionId: overdueInvoice.subscription_id 
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoicesCreated: billedCount,
        suspendedSubscriptions: overdueInvoices?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("ERROR in automatic billing", { message: error?.message || error });
    return new Response(
      JSON.stringify({ error: error?.message || error }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});