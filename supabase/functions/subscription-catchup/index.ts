import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders } from '../_shared/cors.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBSCRIPTION-CATCHUP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting subscription catch-up process");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const today = new Date();
    
    // Find subscriptions with expired periods
    const { data: subscriptions, error: subscriptionsError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lt('current_period_end', today.toISOString());

    if (subscriptionsError) throw subscriptionsError;

    logStep("Found subscriptions with expired periods", { 
      count: subscriptions?.length || 0 
    });

    let fixed = 0;
    
    for (const sub of subscriptions || []) {
      try {
        const periodEnd = new Date(sub.current_period_end);
        let newEnd = new Date(periodEnd);
        
        // Get financial settings for billing cycle
        const { data: settings } = await supabaseClient
          .from('financial_settings')
          .select('*')
          .single();
        
        const billingCycle = sub.billing_cycle || settings?.default_billing_cycle || 'monthly';
        
        // Move period forward until it's in the future
        while (newEnd < today) {
          switch (billingCycle) {
            case 'monthly':
              newEnd.setMonth(newEnd.getMonth() + 1);
              break;
            case 'quarterly':
              newEnd.setMonth(newEnd.getMonth() + 3);
              break;
            case 'semiannual':
              newEnd.setMonth(newEnd.getMonth() + 6);
              break;
            case 'yearly':
              newEnd.setFullYear(newEnd.getFullYear() + 1);
              break;
            default:
              newEnd.setMonth(newEnd.getMonth() + 1);
          }
        }
        
        // Calculate new start date (one period before new end)
        const newStart = new Date(newEnd);
        switch (billingCycle) {
          case 'monthly':
            newStart.setMonth(newStart.getMonth() - 1);
            break;
          case 'quarterly':
            newStart.setMonth(newStart.getMonth() - 3);
            break;
          case 'semiannual':
            newStart.setMonth(newStart.getMonth() - 6);
            break;
          case 'yearly':
            newStart.setFullYear(newStart.getFullYear() - 1);
            break;
          default:
            newStart.setMonth(newStart.getMonth() - 1);
        }
        
        // Update subscription to new period
        const { error: updateError } = await supabaseClient
          .from('subscriptions')
          .update({
            current_period_start: newStart.toISOString(),
            current_period_end: newEnd.toISOString()
          })
          .eq('id', sub.id);
        
        if (updateError) throw updateError;
        
        fixed++;
        logStep("Subscription period updated", { 
          subscriptionId: sub.id,
          oldEnd: periodEnd.toISOString(),
          newStart: newStart.toISOString(),
          newEnd: newEnd.toISOString(),
          billingCycle
        });
        
      } catch (error: any) {
        logStep("Error updating subscription", { 
          subscriptionId: sub.id,
          error: error?.message || error 
        });
      }
    }

    logStep("Catch-up process completed", { 
      totalFound: subscriptions?.length || 0,
      fixed 
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Subscription catch-up completed',
        totalFound: subscriptions?.length || 0,
        fixed,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("ERROR in catch-up process", { error: error?.message || error });
    return new Response(
      JSON.stringify({ 
        error: error?.message || error,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
