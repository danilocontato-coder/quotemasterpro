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

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { quoteId, scheduledDate, notes } = await req.json();

    if (!quoteId || !scheduledDate) {
      throw new Error('quoteId and scheduledDate are required');
    }

    console.log('Scheduling visit:', { quoteId, scheduledDate, userId: user.id });

    // Get supplier_id from user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('supplier_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.supplier_id) {
      throw new Error('User is not a supplier');
    }

    const supplierId = profile.supplier_id;

    // Get quote details
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, client_id, status')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      throw new Error('Quote not found');
    }

    // Check if there's already a visit scheduled for this quote and supplier
    const { data: existingVisit, error: existingError } = await supabase
      .from('quote_visits')
      .select('id, status')
      .eq('quote_id', quoteId)
      .eq('supplier_id', supplierId)
      .in('status', ['scheduled', 'confirmed'])
      .maybeSingle();

    if (existingError) {
      throw new Error('Error checking existing visit');
    }

    if (existingVisit) {
      throw new Error('A visit is already scheduled for this quote');
    }

    // Create visit record
    const { data: visit, error: visitError } = await supabase
      .from('quote_visits')
      .insert({
        quote_id: quoteId,
        supplier_id: supplierId,
        client_id: quote.client_id,
        scheduled_date: scheduledDate,
        notes: notes || null,
        status: 'scheduled'
      })
      .select()
      .single();

    if (visitError) {
      console.error('Error creating visit:', visitError);
      throw new Error('Failed to schedule visit');
    }

    // Update quote status to 'visit_scheduled'
    const { error: quoteUpdateError } = await supabase
      .from('quotes')
      .update({ status: 'visit_scheduled', updated_at: new Date().toISOString() })
      .eq('id', quoteId);

    if (quoteUpdateError) {
      console.error('Error updating quote status:', quoteUpdateError);
    }

    console.log('Visit scheduled successfully:', visit);

    return new Response(
      JSON.stringify({ 
        success: true, 
        visit,
        message: 'Visit scheduled successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in schedule-visit:', error);
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
