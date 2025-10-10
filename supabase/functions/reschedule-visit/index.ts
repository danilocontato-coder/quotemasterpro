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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { visitId, newScheduledDate, reason } = await req.json();

    if (!visitId || !newScheduledDate || !reason) {
      throw new Error('visitId, newScheduledDate and reason are required');
    }

    console.log('Rescheduling visit:', { visitId, newScheduledDate, userId: user.id });

    // Get visit details
    const { data: visit, error: visitError } = await supabase
      .from('quote_visits')
      .select('*, client_id')
      .eq('id', visitId)
      .single();

    if (visitError || !visit) {
      throw new Error('Visit not found');
    }

    // Verify user is the supplier for this visit
    const { data: profile } = await supabase
      .from('profiles')
      .select('supplier_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.supplier_id !== visit.supplier_id) {
      throw new Error('Unauthorized to reschedule this visit');
    }

    // Get client settings for max reschedule attempts
    const { data: settings } = await supabase
      .from('visit_settings')
      .select('max_reschedule_attempts')
      .eq('client_id', visit.client_id)
      .single();

    const maxAttempts = settings?.max_reschedule_attempts || 3;

    // Check if exceeded max reschedule attempts
    if (visit.reschedule_count >= maxAttempts) {
      throw new Error(`Maximum reschedule attempts (${maxAttempts}) reached`);
    }

    // Update visit record
    const { data: updatedVisit, error: updateError } = await supabase
      .from('quote_visits')
      .update({
        previous_date: visit.scheduled_date,
        scheduled_date: newScheduledDate,
        reschedule_count: visit.reschedule_count + 1,
        reschedule_reason: reason,
        status: 'scheduled', // Reset to scheduled if was overdue
        updated_at: new Date().toISOString()
      })
      .eq('id', visitId)
      .select()
      .single();

    if (updateError) {
      console.error('Error rescheduling visit:', updateError);
      throw new Error('Failed to reschedule visit');
    }

    // Update quote status back to 'visit_scheduled' if it was overdue
    const { error: quoteUpdateError } = await supabase
      .from('quotes')
      .update({ status: 'visit_scheduled', updated_at: new Date().toISOString() })
      .eq('id', visit.quote_id)
      .eq('status', 'visit_overdue');

    if (quoteUpdateError) {
      console.error('Error updating quote status:', quoteUpdateError);
    }

    console.log('Visit rescheduled successfully:', updatedVisit);

    return new Response(
      JSON.stringify({ 
        success: true, 
        visit: updatedVisit,
        message: 'Visit rescheduled successfully',
        remaining_attempts: maxAttempts - updatedVisit.reschedule_count
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reschedule-visit:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
