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
      await supabase
        .from('quotes')
        .update({ status: 'under_review' })
        .eq('id', data.quoteId);

      // Criar notificação para os aprovadores
      for (const approverId of approvalLevel.approvers) {
        await supabase.from('notifications').insert({
          user_id: approverId,
          title: 'Nova Aprovação Pendente',
          message: `Cotação #${data.quoteId} aguarda sua aprovação no valor de R$ ${data.amount.toFixed(2)}`,
          type: 'approval_request',
          action_url: `/approvals`,
          metadata: {
            quote_id: data.quoteId,
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

      // Atualizar status da cotação para 'approved'
      await supabase
        .from('quotes')
        .update({ status: 'approved' })
        .eq('id', approval.quote_id);

      // Criar notificação para o solicitante
      const { data: quote } = await supabase
        .from('quotes')
        .select('created_by, title, client_name')
        .eq('id', approval.quote_id)
        .single();

      if (quote?.created_by) {
        await supabase.from('notifications').insert({
          user_id: quote.created_by,
          title: 'Cotação Aprovada',
          message: `Sua cotação "${quote.title}" foi aprovada e pode prosseguir para pagamento`,
          type: 'approval_approved',
          action_url: `/quotes?id=${approval.quote_id}`,
          metadata: {
            quote_id: approval.quote_id,
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
      await supabase
        .from('quotes')
        .update({ status: 'rejected' })
        .eq('id', approval.quote_id);

      // Criar notificação para o solicitante
      const { data: quote } = await supabase
        .from('quotes')
        .select('created_by, title, client_name')
        .eq('id', approval.quote_id)
        .single();

      if (quote?.created_by) {
        await supabase.from('notifications').insert({
          user_id: quote.created_by,
          title: 'Cotação Rejeitada',
          message: `Sua cotação "${quote.title}" foi rejeitada. Motivo: ${comments}`,
          type: 'approval_rejected',
          action_url: `/quotes?id=${approval.quote_id}`,
          metadata: {
            quote_id: approval.quote_id,
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

  // Verificar se uma cotação precisa de aprovação
  static async checkIfApprovalRequired(quoteId: string, amount: number, clientId: string) {
    try {
      const { data: approvalLevels, error } = await supabase
        .from('approval_levels')
        .select('*')
        .eq('client_id', clientId)
        .eq('active', true)
        .lte('amount_threshold', amount)
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
}