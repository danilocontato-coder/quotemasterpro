import { supabase } from '@/integrations/supabase/client';

export interface ApprovalWorkflowData {
  quoteId: string;
  clientId: string;
  amount: number;
  approverId?: string;
  comments?: string;
}

export class ApprovalService {
  // Criar aprovação baseada no valor da cotação e níveis configurados
  static async createApprovalForQuote(data: ApprovalWorkflowData) {
    try {
      // Buscar o nível de aprovação apropriado para o valor
      const { data: approvalLevels, error: levelsError } = await supabase
        .from('approval_levels')
        .select('*')
        .eq('client_id', data.clientId)
        .eq('active', true)
        .lte('amount_threshold', data.amount)
        .order('amount_threshold', { ascending: false })
        .limit(1);

      if (levelsError) throw levelsError;

      // Se não há nível configurado para este valor, a cotação pode ser aprovada automaticamente
      if (!approvalLevels || approvalLevels.length === 0) {
        console.log('No approval level found, auto-approving quote');
        return { autoApproved: true, level: null };
      }

      const approvalLevel = approvalLevels[0];

      // Criar a aprovação
      const { data: approval, error: approvalError } = await supabase
        .from('approvals')
        .insert({
          quote_id: data.quoteId,
          approver_id: data.approverId || approvalLevel.approvers[0], // Primeiro aprovador como padrão
          status: 'pending',
          comments: data.comments || 'Aguardando aprovação automática do sistema'
        })
        .select()
        .single();

      if (approvalError) throw approvalError;

      // Atualizar status da cotação para 'under_review'
      const { error: updateQuoteError } = await supabase
        .from('quotes')
        .update({ status: 'under_review' })
        .eq('id', data.quoteId);

      if (updateQuoteError) throw updateQuoteError;

      // Buscar local_code da cotação para exibição amigável
      const { data: quoteData } = await supabase
        .from('quotes')
        .select('local_code')
        .eq('id', data.quoteId)
        .single();
      
      const quoteCode = quoteData?.local_code || data.quoteId.substring(0, 8);

      // Criar notificação para os aprovadores
      for (const approverId of approvalLevel.approvers) {
        await supabase.from('notifications').insert({
          user_id: approverId,
          title: 'Nova Aprovação Pendente',
          message: `Cotação #${quoteCode} aguarda sua aprovação no valor de R$ ${data.amount.toFixed(2)}`,
          type: 'approval_request',
          action_url: `/approvals`,
          metadata: {
            quote_id: data.quoteId,
            quote_local_code: quoteData?.local_code,
            approval_id: approval.id,
            amount: data.amount
          }
        });
      }

      return { 
        autoApproved: false, 
        approval, 
        level: approvalLevel,
        approversNotified: approvalLevel.approvers.length 
      };

    } catch (error) {
      console.error('Error creating approval:', error);
      throw error;
    }
  }

  // Aprovar uma cotação
  static async approveQuote(approvalId: string, approverId: string, comments?: string) {
    try {
      // Atualizar a aprovação
      const { data: approval, error: approvalError } = await supabase
        .from('approvals')
        .update({
          status: 'approved',
          approver_id: approverId,
          approved_at: new Date().toISOString(),
          comments: comments || 'Aprovado'
        })
        .eq('id', approvalId)
        .select()
        .single();

      if (approvalError) throw approvalError;

      // Atualizar status da cotação de 'pending_approval' para 'approved'
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ status: 'approved' })
        .eq('id', approval.quote_id);

      if (updateError) throw updateError;

      // Criar notificação para o solicitante
      const { data: quote } = await supabase
        .from('quotes')
        .select('created_by, title, client_name, local_code')
        .eq('id', approval.quote_id)
        .single();

      if (quote?.created_by) {
        const quoteCode = quote.local_code || approval.quote_id.substring(0, 8);
        
        await supabase.from('notifications').insert({
          user_id: quote.created_by,
          title: 'Cotação Aprovada',
          message: `Sua cotação "${quote.title}" (#${quoteCode}) foi aprovada e pode prosseguir para pagamento`,
          type: 'approval_approved',
          action_url: `/quotes?id=${approval.quote_id}`,
          metadata: {
            quote_id: approval.quote_id,
            quote_local_code: quote.local_code,
            approved_by: approverId
          }
        });
      }

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: approverId,
        action: 'APPROVE_QUOTE',
        entity_type: 'approvals',
        entity_id: approvalId,
        panel_type: 'client',
        details: {
          quote_id: approval.quote_id,
          comments: comments
        }
      });

      return approval;
    } catch (error) {
      console.error('Error approving quote:', error);
      throw error;
    }
  }

  // Rejeitar uma cotação
  static async rejectQuote(approvalId: string, approverId: string, comments: string) {
    try {
      // Atualizar a aprovação
      const { data: approval, error: approvalError } = await supabase
        .from('approvals')
        .update({
          status: 'rejected',
          approver_id: approverId,
          approved_at: new Date().toISOString(),
          comments: comments
        })
        .eq('id', approvalId)
        .select()
        .single();

      if (approvalError) throw approvalError;

  // Atualizar status da cotação para 'rejected'
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ status: 'rejected' })
        .eq('id', approval.quote_id);

      if (updateError) throw updateError;

      // Criar notificação para o solicitante
      const { data: quote } = await supabase
        .from('quotes')
        .select('created_by, title, client_name, local_code')
        .eq('id', approval.quote_id)
        .single();

      if (quote?.created_by) {
        const quoteCode = quote.local_code || approval.quote_id.substring(0, 8);
        
        await supabase.from('notifications').insert({
          user_id: quote.created_by,
          title: 'Cotação Reprovada',
          message: `Sua cotação "${quote.title}" (#${quoteCode}) foi reprovada. Motivo: ${comments}`,
          type: 'approval_rejected',
          action_url: `/quotes?id=${approval.quote_id}`,
          metadata: {
            quote_id: approval.quote_id,
            quote_local_code: quote.local_code,
            rejected_by: approverId,
            reason: comments
          }
        });
      }

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: approverId,
        action: 'REJECT_QUOTE',
        entity_type: 'approvals',
        entity_id: approvalId,
        panel_type: 'client',
        details: {
          quote_id: approval.quote_id,
          rejection_reason: comments
        }
      });

      return approval;
    } catch (error) {
      console.error('Error rejecting quote:', error);
      throw error;
    }
  }

  // Notificar condomínio sobre nova cotação pendente de aprovação
  static async notifyCondominioAboutPendingQuote(
    quoteId: string,
    condominioId: string,
    amount: number
  ): Promise<void> {
    try {
      console.log('[ApprovalService] Notificando condomínio sobre cotação pendente:', {
        quoteId,
        condominioId,
        amount
      });

      // Buscar usuários do condomínio que são aprovadores
      const { data: approvers } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('client_id', condominioId)
        .eq('active', true);

      if (!approvers || approvers.length === 0) {
        console.warn('[ApprovalService] Nenhum aprovador encontrado para o condomínio');
        return;
      }

      // Buscar dados da cotação
      const { data: quote } = await supabase
        .from('quotes')
        .select('title, client_name, local_code')
        .eq('id', quoteId)
        .single();

      const quoteCode = quote?.local_code || quoteId.substring(0, 8);

      // Criar notificações para todos os aprovadores
      const notifications = approvers.map(approver => ({
        user_id: approver.id,
        title: 'Nova Cotação para Aprovação',
        message: `Nova cotação "${quote?.title || `#${quoteCode}`}" no valor de R$ ${amount.toFixed(2)} aguarda sua aprovação`,
        type: 'approval_request',
        priority: 'high',
        action_url: '/condominio/aprovacoes',
        metadata: {
          quote_id: quoteId,
          quote_local_code: quote?.local_code,
          amount,
          created_by: quote?.client_name
        }
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      console.log('[ApprovalService] Notificações enviadas para', approvers.length, 'aprovadores');
    } catch (error) {
      console.error('[ApprovalService] Erro ao notificar condomínio:', error);
      // Não lançar erro para não interromper o fluxo principal
    }
  }

  // Notificar administradora sobre decisão de aprovação/rejeição
  static async notifyAdministradoraAboutApprovalDecision(
    quoteId: string,
    decision: 'approved' | 'rejected',
    comments: string
  ): Promise<void> {
    try {
      console.log('[ApprovalService] Notificando administradora sobre decisão:', {
        quoteId,
        decision
      });

      // Buscar dados da cotação e da administradora
      const { data: quote } = await supabase
        .from('quotes')
        .select('title, client_id, on_behalf_of_client_id, created_by')
        .eq('id', quoteId)
        .single();

      if (!quote) return;

      // A administradora é quem criou a cotação (on_behalf_of_client_id)
      const administradoraId = quote.on_behalf_of_client_id;
      if (!administradoraId) return;

      // Buscar usuários da administradora (managers e admins)
      const { data: adminUsers } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('client_id', administradoraId)
        .in('role', ['manager', 'admin'])
        .eq('active', true);

      if (!adminUsers || adminUsers.length === 0) {
        console.warn('[ApprovalService] Nenhum usuário da administradora encontrado');
        return;
      }

      const title = decision === 'approved' 
        ? 'Cotação Aprovada pelo Condomínio'
        : 'Cotação Rejeitada pelo Condomínio';

      const message = decision === 'approved'
        ? `A cotação "${quote.title}" foi aprovada pelo condomínio`
        : `A cotação "${quote.title}" foi rejeitada pelo condomínio. Motivo: ${comments}`;

      // Criar notificações para todos os usuários da administradora
      const notifications = adminUsers.map(user => ({
        user_id: user.id,
        title,
        message,
        type: decision === 'approved' ? 'approval_approved' : 'approval_rejected',
        priority: 'high',
        action_url: `/administradora/cotacoes?id=${quoteId}`,
        metadata: {
          quote_id: quoteId,
          decision,
          comments
        }
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      console.log('[ApprovalService] Notificações enviadas para', adminUsers.length, 'usuários da administradora');
    } catch (error) {
      console.error('[ApprovalService] Erro ao notificar administradora:', error);
      // Não lançar erro para não interromper o fluxo principal
    }
  }

  // Verificar se uma cotação precisa de aprovação (usa valor negociado se existir)
  static async checkIfApprovalRequired(quoteId: string, amount: number, clientId: string) {
    try {
      // Verificar se existe negociação IA aprovada para esta cotação
      const { data: aiNegotiation } = await supabase
        .from('ai_negotiations')
        .select('negotiated_amount, status, human_approved')
        .eq('quote_id', quoteId)
        .eq('human_approved', true)
        .single();

      // Usar o valor negociado pela IA se existir e foi aprovado
      const finalAmount = aiNegotiation?.negotiated_amount || amount;

      console.log('[ApprovalService] Checking approval requirement:', {
        quoteId,
        originalAmount: amount,
        negotiatedAmount: aiNegotiation?.negotiated_amount,
        finalAmount,
        aiApproved: !!aiNegotiation
      });

      const { data: approvalLevels, error } = await supabase
        .from('approval_levels')
        .select('*')
        .eq('client_id', clientId)
        .eq('active', true)
        .lte('amount_threshold', finalAmount)
        .order('amount_threshold', { ascending: false })
        .limit(1);

      if (error) throw error;

      return {
        required: approvalLevels && approvalLevels.length > 0,
        level: approvalLevels?.[0] || null
      };
    } catch (error) {
      console.error('Error checking approval requirement:', error);
      return { required: false, level: null };
    }
  }

  // Corrigir cotações que foram finalizadas sem aprovação
  static async fixQuoteApprovalStatus(quoteId: string) {
    try {
      // Buscar a cotação
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError || !quote) throw quoteError || new Error('Quote not found');

      // Verificar se precisa de aprovação
      const { required, level } = await this.checkIfApprovalRequired(
        quoteId, 
        quote.total, 
        quote.client_id
      );

      // Se precisa de aprovação mas não tem registro, criar
      if (required && level) {
        const { data: existingApproval } = await supabase
          .from('approvals')
          .select('*')
          .eq('quote_id', quoteId)
          .single();

        if (!existingApproval) {
          // Criar aprovação retroativa
          await this.createApprovalForQuote({
            quoteId: quote.id,
            clientId: quote.client_id,
            amount: quote.total,
            comments: 'Aprovação criada automaticamente para cotação finalizada'
          });

          console.log(`Approval created for quote ${quoteId}`);
        }
      }

      // Se não precisa de aprovação e está finalized, manter como está
      if (!required && quote.status === 'finalized') {
        console.log(`Quote ${quoteId} doesn't require approval - status maintained as finalized`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error fixing quote approval status:', error);
      throw error;
    }
  }

  // Validar transição de status antes de atualizar cotação
  static async validateStatusTransition(quoteId: string, newStatus: string) {
    try {
      const { data: quote } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (!quote) return { valid: false, reason: 'Quote not found' };

      // Se tentando finalizar, verificar se precisa de aprovação
      if (newStatus === 'finalized') {
        const { required } = await this.checkIfApprovalRequired(
          quoteId,
          quote.total,
          quote.client_id
        );

        if (required) {
          // Verificar se tem aprovação
          const { data: approval } = await supabase
            .from('approvals')
            .select('*')
            .eq('quote_id', quoteId)
            .eq('status', 'approved')
            .single();

          if (!approval) {
            return { 
              valid: false, 
              reason: 'Quote requires approval before being finalized' 
            };
          }
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('Error validating status transition:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }
}