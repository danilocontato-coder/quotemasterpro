import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SupplierResponseRequest {
  token: string; // Token único do fornecedor
  action: 'decline' | 'accept'; // Aceitar (abrir página) ou recusar
  reason?: string; // Motivo da recusa (opcional)
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Process supplier response function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, action, reason }: SupplierResponseRequest = await req.json();

    if (!token || !action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token e ação são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar token para identificar cotação e fornecedor
    const { data: tokenData, error: tokenError } = await supabase
      .from('quote_tokens')
      .select('quote_id, supplier_id')
      .eq('short_code', token)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { quote_id, supplier_id } = tokenData;

    if (action === 'decline') {
      // Atualizar status para "recusado"
      const { error: updateError } = await supabase
        .from('quote_supplier_status')
        .update({
          status: 'declined',
          declined_reason: reason || 'Sem interesse',
          updated_at: new Date().toISOString()
        })
        .eq('quote_id', quote_id)
        .eq('supplier_id', supplier_id);

      if (updateError) {
        console.error('Error updating supplier status:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao atualizar status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar informações do fornecedor e cliente para notificar
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('name')
        .eq('id', supplier_id)
        .single();

      const { data: quote } = await supabase
        .from('quotes')
        .select('client_id, title')
        .eq('id', quote_id)
        .single();

      // Notificar cliente sobre recusa
      if (quote && supplier) {
        await supabase
          .from('notifications')
          .insert({
            title: 'Fornecedor Recusou Cotação',
            message: `${supplier.name} recusou participar da cotação ${quote.title}${reason ? `: ${reason}` : ''}`,
            type: 'info',
            priority: 'normal',
            client_id: quote.client_id,
            metadata: {
              quote_id,
              supplier_id,
              reason
            }
          });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Recusa registrada com sucesso' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se ação for "accept", apenas retornar sucesso (página já carrega normalmente)
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Acesso autorizado' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-supplier-response:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
