import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// This function is triggered by a CRON job daily to check for overdue visits
serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting overdue visit check...');

    const now = new Date();

    // Get all scheduled visits
    const { data: visits, error: visitsError } = await supabase
      .from('quote_visits')
      .select('*, client_id')
      .eq('status', 'scheduled');

    if (visitsError) {
      throw new Error(`Error fetching visits: ${visitsError.message}`);
    }

    if (!visits || visits.length === 0) {
      console.log('No scheduled visits found');
      return new Response(
        JSON.stringify({ success: true, message: 'No scheduled visits to check' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${visits.length} scheduled visits to check`);

    let overdueCount = 0;
    let disqualifiedCount = 0;

    for (const visit of visits) {
      // Get client settings
      const { data: settings } = await supabase
        .from('visit_settings')
        .select('overdue_tolerance_days, auto_disqualify_on_overdue')
        .eq('client_id', visit.client_id)
        .single();

      const toleranceDays = settings?.overdue_tolerance_days || 2;
      const autoDisqualify = settings?.auto_disqualify_on_overdue || false;

      const scheduledDate = new Date(visit.scheduled_date);
      const daysSinceScheduled = Math.floor((now.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24));

      // Check if visit is overdue
      if (daysSinceScheduled > toleranceDays) {
        console.log(`Visit ${visit.id} is overdue (${daysSinceScheduled} days past scheduled date)`);

        // Update visit status to overdue
        const { error: updateError } = await supabase
          .from('quote_visits')
          .update({
            status: 'overdue',
            updated_at: new Date().toISOString()
          })
          .eq('id', visit.id);

        if (updateError) {
          console.error(`Error updating visit ${visit.id}:`, updateError);
          continue;
        }

        // Update quote status
        const { error: quoteError } = await supabase
          .from('quotes')
          .update({
            status: 'visit_overdue',
            updated_at: new Date().toISOString()
          })
          .eq('id', visit.quote_id);

        if (quoteError) {
          console.error(`Error updating quote ${visit.quote_id}:`, quoteError);
        }

        overdueCount++;

        // Handle auto-disqualification if enabled
        if (autoDisqualify) {
          // Mark supplier as disqualified for this quote
          // This could be done by removing them from selected_supplier_ids
          const { data: quote } = await supabase
            .from('quotes')
            .select('selected_supplier_ids')
            .eq('id', visit.quote_id)
            .single();

          if (quote && quote.selected_supplier_ids) {
            const updatedSuppliers = (quote.selected_supplier_ids as string[]).filter(
              (id: string) => id !== visit.supplier_id
            );

            await supabase
              .from('quotes')
              .update({ selected_supplier_ids: updatedSuppliers })
              .eq('id', visit.quote_id);

            disqualifiedCount++;
            console.log(`Supplier ${visit.supplier_id} disqualified from quote ${visit.quote_id}`);
          }
        }
      }
    }

    const result = {
      success: true,
      checked: visits.length,
      overdue: overdueCount,
      disqualified: disqualifiedCount,
      timestamp: now.toISOString()
    };

    console.log('Overdue check completed:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-visit-overdue:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
});
