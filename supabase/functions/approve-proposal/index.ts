import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.33.2';
import { corsHeaders } from '../_shared/cors.ts';
import { resolveEvolutionConfig, sendEvolutionWhatsApp } from '../_shared/evolution.ts';

interface ApprovalRequest {
  responseId: string;
  quoteId: string;
  comments?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { responseId, quoteId, comments }: ApprovalRequest = await req.json();

    console.log('🔄 Starting proposal approval process:', { responseId, quoteId });

    // 1. Get quote response details
    const { data: response, error: responseError } = await supabase
      .from('quote_responses')
      .select(`
        *,
        suppliers!inner(name, whatsapp, email)
      `)
      .eq('id', responseId)
      .single();

    if (responseError || !response) {
      console.error('❌ Error fetching quote response:', responseError);
      return new Response(
        JSON.stringify({ error: 'Proposta não encontrada' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. Get quote details
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      console.error('❌ Error fetching quote:', quoteError);
      return new Response(
        JSON.stringify({ error: 'Cotação não encontrada' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 3. Update quote response status to approved
    const { error: updateError } = await supabase
      .from('quote_responses')
      .update({ 
        status: 'approved',
        notes: comments ? `${response.notes || ''}\n\nAprovação: ${comments}` : response.notes
      })
      .eq('id', responseId);

    if (updateError) {
      console.error('❌ Error updating quote response:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao aprovar proposta' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 4. Update quote status to approved and set selected supplier
    const { error: quoteUpdateError } = await supabase
      .from('quotes')
      .update({ 
        status: 'approved',
        supplier_id: response.supplier_id,
        supplier_name: response.supplier_name
      })
      .eq('id', quoteId);

    if (quoteUpdateError) {
      console.error('❌ Error updating quote:', quoteUpdateError);
    }

    // 5. Reject all other proposals for this quote automatically
    const { data: otherResponses, error: otherResponsesError } = await supabase
      .from('quote_responses')
      .update({ 
        status: 'rejected',
        notes: 'Proposta não selecionada - outra proposta foi aprovada'
      })
      .neq('id', responseId)
      .eq('quote_id', quoteId)
      .eq('status', 'pending')
      .select('id, supplier_id, supplier_name');

    if (otherResponsesError) {
      console.error('❌ Error rejecting other proposals:', otherResponsesError);
    } else {
      console.log(`✅ Auto-rejected ${otherResponses?.length || 0} other proposals`);
    }

    // 6. Send WhatsApp notification to approved supplier
    let whatsappResult = null;
    if (response.suppliers?.whatsapp) {
      try {
        const evolutionConfig = await resolveEvolutionConfig(supabase, quote.client_id);
        
        if (evolutionConfig.apiUrl && evolutionConfig.token) {
          const message = `🎉 *Parabéns! Sua proposta foi APROVADA!*

*Cotação:* ${quote.title}
*Valor aprovado:* R$ ${response.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
*Prazo de entrega:* ${response.delivery_time || 'A definir'} dias

${comments ? `*Observações:* ${comments}` : ''}

Em breve entraremos em contato para finalizar os detalhes da compra.

Obrigado pela sua proposta! 🤝`;

          whatsappResult = await sendEvolutionWhatsApp(
            evolutionConfig,
            response.suppliers.whatsapp,
            message
          );

          console.log('📱 WhatsApp notification result:', whatsappResult);
        } else {
          console.log('⚠️ Evolution API not configured');
        }
      } catch (whatsappError) {
        console.error('❌ Error sending WhatsApp:', whatsappError);
      }
    }

    // 7. Create notification for approved supplier
    const { data: supplierUser } = await supabase
      .from('users')
      .select('auth_user_id')
      .eq('supplier_id', response.supplier_id)
      .single();

    if (supplierUser?.auth_user_id) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: supplierUser.auth_user_id,
          title: '🎉 Proposta Aprovada!',
          message: `Sua proposta para "${quote.title}" foi aprovada! Valor: R$ ${response.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          type: 'proposal_approved',
          priority: 'high',
          metadata: {
            quote_id: quoteId,
            response_id: responseId,
            approved_amount: response.total_amount,
            whatsapp_sent: whatsappResult?.success || false,
            comments: comments
          }
        });

      if (notificationError) {
        console.error('❌ Error creating notification:', notificationError);
      }
    } else {
      console.log('⚠️ Supplier user not found for notification');
    }


    // 8. Create notifications for rejected suppliers
    if (otherResponses && otherResponses.length > 0) {
      for (const rejectedResponse of otherResponses) {
        try {
          const { data: rejectedSupplierUser } = await supabase
            .from('users')
            .select('auth_user_id')
            .eq('supplier_id', rejectedResponse.supplier_id)
            .single();

          if (rejectedSupplierUser?.auth_user_id) {
            await supabase.from('notifications').insert({
              user_id: rejectedSupplierUser.auth_user_id,
              title: '📋 Proposta Não Selecionada',
              message: `Sua proposta para "${quote.title}" não foi selecionada. Outra proposta foi aprovada pelo cliente.`,
              type: 'proposal_rejected',
              priority: 'normal',
              metadata: {
                quote_id: quoteId,
                response_id: rejectedResponse.id,
                reason: 'Outra proposta foi selecionada'
              }
            });
          }
        } catch (notifError) {
          console.error(`❌ Error notifying rejected supplier ${rejectedResponse.supplier_id}:`, notifError);
        }
      }
    }

    // 9. Log audit trail
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: quote.created_by,
        action: 'PROPOSAL_APPROVED',
        entity_type: 'quote_response',
        entity_id: responseId,
        panel_type: 'client',
        details: {
          quote_id: quoteId,
          supplier_id: response.supplier_id,
          supplier_name: response.supplier_name,
          approved_amount: response.total_amount,
          comments: comments,
          whatsapp_sent: whatsappResult?.success || false,
          other_proposals_rejected: otherResponses?.length || 0
        }
      });

    if (auditError) {
      console.error('❌ Error creating audit log:', auditError);
    }

    console.log('✅ Proposal approval completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Proposta aprovada com sucesso!',
        whatsapp_sent: whatsappResult?.success || false,
        approved_amount: response.total_amount,
        supplier_name: response.supplier_name
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error in approve-proposal:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});