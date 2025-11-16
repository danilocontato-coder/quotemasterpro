import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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
      .select('id, client_id, status, suppliers_sent_count')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      throw new Error('Quote not found');
    }

    // Upsert visit to prevent duplicates (unique index on quote_id, supplier_id)
    const { data: visit, error: visitError } = await supabase
      .from('quote_visits')
      .upsert({
        quote_id: quoteId,
        supplier_id: supplierId,
        client_id: quote.client_id,
        scheduled_date: scheduledDate,
        notes: notes || null,
        status: 'scheduled',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'quote_id,supplier_id'
      })
      .select()
      .single();

    if (visitError) {
      console.error('Error upserting visit:', visitError);
      throw new Error('Failed to schedule visit');
    }

    console.log('Visit scheduled successfully:', visit);

    // Buscar todas as visitas para contar por fornecedor distinto
    const { data: allVisits, error: visitsError } = await supabase
      .from('quote_visits')
      .select('status, supplier_id')
      .eq('quote_id', quoteId);

    if (visitsError) {
      console.error('Error fetching visits:', visitsError);
      throw new Error('Failed to fetch visit statistics');
    }

    // Consolidar por supplier_id (apenas fornecedores únicos com visita agendada ou confirmada)
    const uniqueSuppliers = new Set(
      (allVisits || [])
        .filter(v => v.status === 'scheduled' || v.status === 'confirmed')
        .map(v => v.supplier_id)
    );
    const scheduledOrConfirmedCount = uniqueSuppliers.size;
    
    const totalSuppliers = quote.suppliers_sent_count || 1;
    
    // Determinar novo status baseado no progresso
    let newQuoteStatus = 'awaiting_visit';
    if (scheduledOrConfirmedCount > 0 && scheduledOrConfirmedCount < totalSuppliers) {
      newQuoteStatus = 'visit_partial_scheduled';
    } else if (scheduledOrConfirmedCount >= totalSuppliers) {
      newQuoteStatus = 'visit_scheduled';
    }

    console.log('Updating quote status:', { scheduledOrConfirmedCount, totalSuppliers, newQuoteStatus });

    // Atualizar status da cotação
    const { error: quoteUpdateError } = await supabase
      .from('quotes')
      .update({ status: newQuoteStatus, updated_at: new Date().toISOString() })
      .eq('id', quoteId);

    if (quoteUpdateError) {
      console.error('Error updating quote status:', quoteUpdateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to update quote status',
          details: quoteUpdateError.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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
