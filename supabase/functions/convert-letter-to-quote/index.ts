import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConvertLetterRequest {
  letterId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { letterId }: ConvertLetterRequest = await req.json();

    console.log('[convert-letter-to-quote] Converting letter:', letterId);

    // Fetch letter data
    const { data: letter, error: letterError } = await supabase
      .from('invitation_letters')
      .select('*')
      .eq('id', letterId)
      .single();

    if (letterError || !letter) {
      console.error('[convert-letter-to-quote] Letter not found:', letterError);
      throw new Error('Carta convite não encontrada');
    }

    // Check if already linked to a quote
    if (letter.quote_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Esta carta já está vinculada a uma cotação',
          quoteId: letter.quote_id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Fetch accepted suppliers
    const { data: acceptedSuppliers, error: suppliersError } = await supabase
      .from('invitation_letter_suppliers')
      .select(`
        supplier_id,
        suppliers (
          id,
          name,
          email
        )
      `)
      .eq('invitation_letter_id', letterId)
      .eq('response_status', 'accepted');

    if (suppliersError) {
      console.error('[convert-letter-to-quote] Error fetching suppliers:', suppliersError);
      throw new Error('Erro ao buscar fornecedores');
    }

    if (!acceptedSuppliers || acceptedSuppliers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhum fornecedor aceitou o convite ainda'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log('[convert-letter-to-quote] Found', acceptedSuppliers.length, 'accepted suppliers');

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Usuário não encontrado');
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single();

    if (!profile?.client_id) {
      throw new Error('Cliente não encontrado');
    }

    // Generate quote code
    const { data: codeData } = await supabase.rpc('next_quote_id_by_client', {
      p_client_id: profile.client_id
    });

    const quoteCode = codeData || 'RFQ99';

    // Create quote from letter
    const { data: newQuote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        client_id: profile.client_id,
        local_code: quoteCode,
        title: letter.title,
        description: letter.description,
        deadline: letter.deadline,
        status: 'draft',
        currency: 'BRL',
        created_by: user.id
      })
      .select()
      .single();

    if (quoteError) {
      console.error('[convert-letter-to-quote] Error creating quote:', quoteError);
      throw new Error('Erro ao criar cotação: ' + quoteError.message);
    }

    console.log('[convert-letter-to-quote] Quote created:', newQuote.id);

    // Add accepted suppliers to quote
    const supplierAssignments = acceptedSuppliers.map(s => ({
      quote_id: newQuote.id,
      supplier_id: s.supplier_id
    }));

    const { error: assignError } = await supabase
      .from('quote_suppliers')
      .insert(supplierAssignments);

    if (assignError) {
      console.error('[convert-letter-to-quote] Error assigning suppliers:', assignError);
      // Don't fail the whole operation, just log
    }

    // Link letter to quote
    const { error: updateError } = await supabase
      .from('invitation_letters')
      .update({ quote_id: newQuote.id })
      .eq('id', letterId);

    if (updateError) {
      console.error('[convert-letter-to-quote] Error linking letter:', updateError);
    }

    // Transfer attachments if any
    if (letter.attachments && letter.attachments.length > 0) {
      const { error: attachError } = await supabase
        .from('quotes')
        .update({ 
          attachments: letter.attachments 
        })
        .eq('id', newQuote.id);

      if (attachError) {
        console.error('[convert-letter-to-quote] Error transferring attachments:', attachError);
      }
    }

    // Audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'CONVERT_LETTER_TO_QUOTE',
        panel_type: 'client',
        entity_type: 'quotes',
        entity_id: newQuote.id,
        details: {
          letter_id: letterId,
          letter_number: letter.letter_number,
          quote_code: quoteCode,
          suppliers_added: acceptedSuppliers.length
        }
      });

    console.log('[convert-letter-to-quote] Conversion completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        quoteId: newQuote.id,
        quoteCode: quoteCode,
        suppliersAdded: acceptedSuppliers.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[convert-letter-to-quote] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});