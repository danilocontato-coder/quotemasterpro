import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.33.2';
import { corsHeaders } from '../_shared/cors.ts';
import { resolveEvolutionConfig, sendEvolutionWhatsApp } from '../_shared/evolution.ts';
import { resolveEmailConfig, sendEmail, replaceVariables } from '../_shared/email.ts';

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

    // 3. Check if approval workflow is required (NEW)
    const { data: approvalCheck } = await supabase.rpc('check_approval_required', {
      p_quote_id: quoteId,
      p_amount: response.total_amount,
      p_client_id: quote.client_id
    });

    console.log('🔍 Approval check result:', approvalCheck);

    // If approval is required, create approval workflow instead of direct approval
    if (approvalCheck?.required) {
      console.log('📋 Approval required - creating approval workflow');
      
      const approvalLevel = approvalCheck.level;
      
      // Update quote response to 'selected' (not approved yet)
      const { error: updateError } = await supabase
        .from('quote_responses')
        .update({ 
          status: 'selected',
          notes: comments ? `${response.notes || ''}\n\nSelecionada para aprovação: ${comments}` : response.notes
        })
        .eq('id', responseId);

      if (updateError) {
        console.error('❌ Error updating quote response:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erro ao selecionar proposta' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update quote status to 'pending_approval' (bloqueada aguardando aprovação)
      const { error: quoteUpdateError } = await supabase
        .from('quotes')
        .update({ 
          status: 'pending_approval',
          supplier_id: response.supplier_id,
          supplier_name: response.supplier_name
        })
        .eq('id', quoteId);

      if (quoteUpdateError) {
        console.error('❌ Error updating quote to under_review:', quoteUpdateError);
      }

      // Create approval records for each approver (now validated by RPC)
      const approverIds = approvalLevel.approvers || [];
      let validApproversCount = 0;
      
      for (const approverId of approverIds) {
        // Validate approver exists in profiles before creating approval
        const { data: approverProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, email, active')
          .eq('id', approverId)
          .single();
        
        if (profileError || !approverProfile || !approverProfile.active) {
          console.error(`⚠️ Skipping invalid/inactive approver ${approverId}:`, profileError?.message);
          continue;
        }
        
        const { error: approvalError } = await supabase
          .from('approvals')
          .insert({
            quote_id: quoteId,
            approver_id: approverId,
            status: 'pending',
            comments: `Proposta de ${response.supplier_name} - R$ ${response.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          });

        if (approvalError) {
          console.error(`❌ Error creating approval for ${approverId}:`, approvalError);
          continue;
        }
        
        validApproversCount++;
        
        // Notify approver
        await supabase.from('notifications').insert({
          user_id: approverId,
          title: '📋 Nova Aprovação Pendente',
          message: `Cotação "${quote.title}" aguarda sua aprovação. Valor: R$ ${response.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          type: 'approval_pending',
          priority: 'high',
          action_url: '/approvals',
          metadata: {
            quote_id: quoteId,
            response_id: responseId,
            amount: response.total_amount,
            approval_level: approvalLevel.name,
            approver_name: approverProfile.name
          }
        });
      }
      
      // If no valid approvers were found, fall back to direct approval with warning
      if (validApproversCount === 0) {
        console.error(`⚠️ CRITICAL: No valid approvers for level "${approvalLevel.name}". Auto-approving with audit log.`);
        
        // Update quote response and quote to approved
        await supabase.from('quote_responses').update({ status: 'approved' }).eq('id', responseId);
        await supabase.from('quotes').update({ status: 'approved' }).eq('id', quoteId);
        
        // Log critical audit event
        await supabase.from('audit_logs').insert({
          user_id: quote.created_by,
          action: 'AUTO_APPROVED_NO_APPROVERS',
          entity_type: 'approvals',
          entity_id: quoteId,
          panel_type: 'system',
          details: {
            quote_id: quoteId,
            response_id: responseId,
            approval_level_id: approvalLevel.id,
            approval_level_name: approvalLevel.name,
            reason: 'no_valid_approvers_found',
            configured_approvers: approverIds,
            amount: response.total_amount
          }
        });
        
        return new Response(
          JSON.stringify({
            success: true,
            approval_required: false,
            auto_approved: true,
            warning: 'Nível de aprovação sem aprovadores válidos. Cotação aprovada automaticamente. Verifique configuração de níveis de aprovação.',
            message: 'Proposta aprovada automaticamente (nível sem aprovadores válidos)',
            amount: response.total_amount
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log audit trail for approval creation
      await supabase.from('audit_logs').insert({
        user_id: quote.created_by,
        action: 'APPROVAL_WORKFLOW_CREATED',
        entity_type: 'approvals',
        entity_id: quoteId,
        panel_type: 'client',
        details: {
          quote_id: quoteId,
          response_id: responseId,
          approval_level: approvalLevel.name,
          approvers_count: approverIds.length,
          amount: response.total_amount,
          supplier_name: response.supplier_name
        }
      });

      console.log(`✅ Created approval workflow with ${validApproversCount} valid approvers`);

      return new Response(
        JSON.stringify({
          success: true,
          approval_required: true,
          message: 'Proposta selecionada! Aguardando aprovação conforme nível configurado.',
          approval_level: approvalLevel.name,
          approvers_count: validApproversCount,
          total_configured: approverIds.length,
          amount: response.total_amount
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Continue with direct approval if no approval required
    console.log('✅ No approval required - proceeding with direct approval');

    // 4. Update quote response status to approved
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

    // 5. Update quote status to approved and set selected supplier
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

    // 6. Reject all other proposals for this quote automatically
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

    // 7. Send WhatsApp notification to approved supplier
    let whatsappResult = null;
    if (response.suppliers?.whatsapp) {
      try {
        const evolutionConfig = await resolveEvolutionConfig(supabase, quote.client_id);
        
        if (evolutionConfig.apiUrl && evolutionConfig.token) {
          // Buscar template de WhatsApp
          const { data: whatsappTemplate } = await supabase
            .from('whatsapp_templates')
            .select('*')
            .eq('template_type', 'proposal_approved')
            .eq('active', true)
            .or(`client_id.eq.${quote.client_id},is_global.eq.true`)
            .order('is_default', { ascending: false })
            .order('client_id', { ascending: false, nullsFirst: false })
            .limit(1)
            .single();

          let message = `🎉 *Parabéns! Sua proposta foi APROVADA!*

*Cotação:* ${quote.title}
*Valor aprovado:* R$ ${response.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
*Prazo de entrega:* ${response.delivery_time || 'A definir'} dias

${comments ? `*Observações:* ${comments}` : ''}

Em breve entraremos em contato para finalizar os detalhes da compra.

Obrigado pela sua proposta! 🤝`;

          if (whatsappTemplate) {
            const variables = {
              quote_title: quote.title,
              client_name: quote.client_name,
              approved_amount: response.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
              delivery_time: response.delivery_time || 'A definir',
              comments: comments || ''
            };
            message = replaceVariables(whatsappTemplate.message_content, variables);
          }

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

    // 8. Send Email notification to approved supplier
    let emailResult = null;
    if (response.suppliers?.email) {
      try {
        const emailConfig = await resolveEmailConfig(supabase, quote.client_id);
        
        if (emailConfig) {
          // Buscar template de e-mail
          const { data: emailTemplate } = await supabase
            .from('email_templates')
            .select('*')
            .eq('template_type', 'proposal_approved')
            .eq('active', true)
            .or(`client_id.eq.${quote.client_id},is_global.eq.true`)
            .order('is_default', { ascending: false })
            .order('client_id', { ascending: false, nullsFirst: false })
            .limit(1)
            .single();
          
          if (emailTemplate) {
            const variables = {
              quote_title: quote.title,
              client_name: quote.client_name,
              approved_amount: response.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
              delivery_time: response.delivery_time || 'A definir',
              comments: comments || '',
              dashboard_url: `${Deno.env.get('SUPABASE_URL')}/supplier/dashboard`,
              client_email: quote.client_email || ''
            };
            
            const subject = replaceVariables(emailTemplate.subject, variables);
            const htmlContent = replaceVariables(emailTemplate.html_content, variables);
            const plainText = emailTemplate.plain_text_content 
              ? replaceVariables(emailTemplate.plain_text_content, variables)
              : undefined;
            
            emailResult = await sendEmail(emailConfig, {
              to: response.suppliers.email,
              subject,
              html: htmlContent,
              plainText
            });
            
            console.log('📧 Email notification result:', emailResult);
          } else {
            console.log('⚠️ No email template found for proposal_approved');
          }
        } else {
          console.log('⚠️ Email config not configured');
        }
      } catch (emailError) {
        console.error('❌ Error sending email:', emailError);
      }
    }

    // 9. Create notification for approved supplier
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
            email_sent: emailResult?.success || false,
            comments: comments
          }
        });

      if (notificationError) {
        console.error('❌ Error creating notification:', notificationError);
      }
    } else {
      console.log('⚠️ Supplier user not found for notification');
    }

    // 10. Check if should notify rejected suppliers (configurable)
    let shouldNotifyRejected = true;
    
    try {
      // First check client-specific setting
      const { data: clientData } = await supabase
        .from('clients')
        .select('settings')
        .eq('id', quote.client_id)
        .single();
      
      if (clientData?.settings?.auto_notify_rejected_proposals !== undefined) {
        shouldNotifyRejected = clientData.settings.auto_notify_rejected_proposals;
      } else {
        // Fallback to system setting
        const { data: systemSetting } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'auto_notify_rejected_proposals')
          .single();
        
        if (systemSetting?.setting_value?.enabled !== undefined) {
          shouldNotifyRejected = systemSetting.setting_value.enabled;
        }
      }
    } catch (settingsError) {
      console.error('❌ Error checking notification settings:', settingsError);
      // Default to true if there's an error
    }

    console.log('📤 Should notify rejected suppliers:', shouldNotifyRejected);

    // 11. Create notifications for rejected suppliers (if enabled)
    if (shouldNotifyRejected && otherResponses && otherResponses.length > 0) {
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
              message: `A cotação "${quote.title}" foi finalizada. Outra proposta foi escolhida pelo cliente.`,
              type: 'info',
              priority: 'normal',
              metadata: {
                quote_id: quoteId,
                response_id: rejectedResponse.id,
                rejected_at: new Date().toISOString()
              }
            });
          }
        } catch (notifError) {
          console.error(`❌ Error notifying rejected supplier ${rejectedResponse.supplier_id}:`, notifError);
        }
      }
      console.log(`📤 Notified ${otherResponses.length} rejected suppliers`);
    } else if (!shouldNotifyRejected) {
      console.log('📤 Skipped notifying rejected suppliers (disabled by client setting)');
    }

    // 12. Log audit trail
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
          email_sent: emailResult?.success || false,
          other_proposals_rejected: otherResponses?.length || 0,
          rejected_suppliers_notified: shouldNotifyRejected && otherResponses ? otherResponses.length : 0
        }
      });

    if (auditError) {
      console.error('❌ Error creating audit log:', auditError);
    }

    console.log('✅ Proposal approval completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        approval_required: false,
        message: 'Proposta aprovada com sucesso!',
        whatsapp_sent: whatsappResult?.success || false,
        email_sent: emailResult?.success || false,
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
        details: (error as any)?.message || 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
