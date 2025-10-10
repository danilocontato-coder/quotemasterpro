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

    const { visitId, confirmedDate, confirmationNotes, attachments } = await req.json();

    if (!visitId || !confirmedDate) {
      throw new Error('visitId and confirmedDate are required');
    }

    console.log('Confirming visit:', { visitId, confirmedDate, userId: user.id });

    // Get visit details
    const { data: visit, error: visitError } = await supabase
      .from('quote_visits')
      .select('id, quote_id, supplier_id, client_id, status')
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
      throw new Error('Unauthorized to confirm this visit');
    }

    // Update visit record
    const { data: updatedVisit, error: updateError } = await supabase
      .from('quote_visits')
      .update({
        status: 'confirmed',
        confirmed_date: confirmedDate,
        confirmed_by: user.id,
        confirmation_notes: confirmationNotes || null,
        attachments: attachments || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', visitId)
      .select()
      .single();

    if (updateError) {
      console.error('Error confirming visit:', updateError);
      throw new Error('Failed to confirm visit');
    }

    // Após confirmar visita, liberar para proposta
    const { error: quoteError } = await supabase
      .from('quotes')
      .update({ 
        status: 'visit_confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', visit.quote_id);

    if (quoteError) {
      console.error('Error updating quote status:', quoteError);
    }

    console.log('Visit confirmed successfully:', updatedVisit);

    return new Response(
      JSON.stringify({ 
        success: true, 
        visit: updatedVisit,
        message: 'Visit confirmed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in confirm-visit:', error);
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
