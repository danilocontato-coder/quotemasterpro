import { supabase } from '@/integrations/supabase/client';

// Helper functions para criar notificações automáticas do sistema

export const createQuoteNotification = async (quoteData: {
  quote_id: string;
  local_code: string;
  quote_title: string;
  client_id: string;
  items_count: number;
}) => {
  try {
    await supabase.functions.invoke('create-notification', {
      body: {
        client_id: quoteData.client_id,
        notify_all_client_users: true,
        title: 'Nova Cotação Criada',
        message: `A cotação #${quoteData.local_code} foi criada: ${quoteData.quote_title}`,
        type: 'quote',
        priority: 'normal',
        action_url: '/quotes',
        metadata: {
          quote_id: quoteData.quote_id,
          quote_title: quoteData.quote_title,
          items_count: quoteData.items_count
        }
      }
    });
  } catch (error) {
    console.error('Erro ao criar notificação de cotação:', error);
  }
};

export const createProposalNotification = async (proposalData: {
  quote_id: string;
  local_code: string;
  supplier_name: string;
  total_amount: number;
  client_id: string;
}) => {
  try {
    await supabase.functions.invoke('create-notification', {
      body: {
        client_id: proposalData.client_id,
        notify_all_client_users: true,
        title: 'Nova Proposta Recebida',
        message: `${proposalData.supplier_name} enviou uma proposta de R$ ${proposalData.total_amount.toFixed(2)} para a cotação #${proposalData.local_code}`,
        type: 'proposal',
        priority: 'high',
        action_url: '/quotes',
        metadata: {
          quote_id: proposalData.quote_id,
          supplier_name: proposalData.supplier_name,
          total_amount: proposalData.total_amount
        }
      }
    });
  } catch (error) {
    console.error('Erro ao criar notificação de proposta:', error);
  }
};

export const createPaymentNotification = async (paymentData: {
  quote_id: string;
  local_code: string;
  amount: number;
  status: 'completed' | 'failed';
  client_id: string;
}) => {
  try {
    const isSuccess = paymentData.status === 'completed';
    
    await supabase.functions.invoke('create-notification', {
      body: {
        client_id: paymentData.client_id,
        notify_all_client_users: true,
        title: isSuccess ? 'Pagamento Confirmado' : 'Falha no Pagamento',
        message: isSuccess 
          ? `Pagamento de R$ ${paymentData.amount.toFixed(2)} foi processado com sucesso para a cotação #${paymentData.local_code}`
          : `Falha no pagamento de R$ ${paymentData.amount.toFixed(2)} para a cotação #${paymentData.local_code}. Verifique os dados e tente novamente.`,
        type: 'payment',
        priority: isSuccess ? 'normal' : 'high',
        action_url: '/payments',
        metadata: {
          quote_id: paymentData.quote_id,
          amount: paymentData.amount,
          status: paymentData.status
        }
      }
    });
  } catch (error) {
    console.error('Erro ao criar notificação de pagamento:', error);
  }
};

export const createDeliveryNotification = async (deliveryData: {
  quote_id: string;
  local_code: string;
  scheduled_date: string;
  client_id: string;
  supplier_name: string;
}) => {
  try {
    const scheduledDate = new Date(deliveryData.scheduled_date);
    const formattedDate = scheduledDate.toLocaleDateString('pt-BR');
    const formattedTime = scheduledDate.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    await supabase.functions.invoke('create-notification', {
      body: {
        client_id: deliveryData.client_id,
        notify_all_client_users: true,
        title: 'Entrega Agendada',
        message: `${deliveryData.supplier_name} agendou uma entrega para ${formattedDate} às ${formattedTime} - Cotação #${deliveryData.local_code}`,
        type: 'delivery',
        priority: 'high',
        action_url: '/quotes',
        metadata: {
          quote_id: deliveryData.quote_id,
          scheduled_date: deliveryData.scheduled_date,
          supplier_name: deliveryData.supplier_name
        }
      }
    });
  } catch (error) {
    console.error('Erro ao criar notificação de entrega:', error);
  }
};

export const createApprovalNotification = async (approvalData: {
  quote_id: string;
  local_code: string;
  status: 'approved' | 'rejected';
  approver_name: string;
  client_id: string;
  comments?: string;
}) => {
  try {
    const isApproved = approvalData.status === 'approved';
    
    await supabase.functions.invoke('create-notification', {
      body: {
        client_id: approvalData.client_id,
        notify_all_client_users: true,
        title: isApproved ? 'Cotação Aprovada' : 'Cotação Rejeitada',
        message: `A cotação #${approvalData.local_code} foi ${isApproved ? 'aprovada' : 'rejeitada'} por ${approvalData.approver_name}`,
        type: isApproved ? 'success' : 'warning',
        priority: 'high',
        action_url: '/quotes',
        metadata: {
          quote_id: approvalData.quote_id,
          status: approvalData.status,
          approver_name: approvalData.approver_name,
          comments: approvalData.comments
        }
      }
    });
  } catch (error) {
    console.error('Erro ao criar notificação de aprovação:', error);
  }
};

export const createTicketNotification = async (ticketData: {
  ticket_id: string;
  subject: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  client_name: string;
  type: 'new_ticket' | 'response' | 'status_change';
  target_user_id?: string;
}) => {
  try {
    const priorityMap = {
      'low': 'low',
      'medium': 'normal',
      'high': 'high',
      'urgent': 'high'
    } as const;

    const messages = {
      'new_ticket': `Novo ticket de suporte criado: ${ticketData.subject}`,
      'response': `Nova resposta no ticket #${ticketData.ticket_id}`,
      'status_change': `Status do ticket #${ticketData.ticket_id} foi atualizado`
    };

    await supabase.functions.invoke('create-notification', {
      body: {
        user_id: ticketData.target_user_id,
        title: 'Ticket de Suporte',
        message: messages[ticketData.type],
        type: 'ticket',
        priority: priorityMap[ticketData.priority],
        action_url: '/communication',
        metadata: {
          ticket_id: ticketData.ticket_id,
          subject: ticketData.subject,
          priority: ticketData.priority,
          client_name: ticketData.client_name
        }
      }
    });
  } catch (error) {
    console.error('Erro ao criar notificação de ticket:', error);
  }
};

// ============================================
// FASE 6: NOTIFICAÇÕES PARA FORNECEDORES
// ============================================

export const createSupplierQuoteNotification = async (data: {
  supplier_id: string;
  quote_id: string;
  local_code: string;
  quote_title: string;
  deadline: string;
}) => {
  try {
    await supabase.rpc('notify_supplier_users', {
      p_supplier_id: data.supplier_id,
      p_title: '📋 Nova Cotação Recebida',
      p_message: `Você recebeu uma nova cotação: ${data.quote_title}. Prazo: ${new Date(data.deadline).toLocaleDateString('pt-BR')}`,
      p_type: 'quote',
      p_priority: 'high',
      p_action_url: `/supplier/quotes`, // 🆕 Navega direto para a lista de cotações
      p_metadata: {
        quote_id: data.quote_id,
        local_code: data.local_code,
        deadline: data.deadline
      }
    });
  } catch (error) {
    console.error('Erro ao notificar fornecedor sobre nova cotação:', error);
  }
};

export const createSupplierPaymentNotification = async (data: {
  supplier_id: string;
  quote_id: string;
  local_code: string;
  amount: number;
}) => {
  try {
    await supabase.rpc('notify_supplier_users', {
      p_supplier_id: data.supplier_id,
      p_title: '💰 Pagamento Confirmado!',
      p_message: `O pagamento de R$ ${data.amount.toFixed(2)} foi confirmado e está em custódia. Agende a entrega!`,
      p_type: 'payment',
      p_priority: 'high',
      p_action_url: '/supplier/deliveries',
      p_metadata: {
        quote_id: data.quote_id,
        local_code: data.local_code,
        amount: data.amount,
        action: 'schedule_delivery'
      }
    });
  } catch (error) {
    console.error('Erro ao notificar fornecedor sobre pagamento:', error);
  }
};

export const createSupplierProposalStatusNotification = async (data: {
  supplier_id: string;
  quote_id: string;
  local_code: string;
  quote_title: string;
  status: 'approved' | 'rejected';
}) => {
  try {
    const isApproved = data.status === 'approved';
    
    await supabase.rpc('notify_supplier_users', {
      p_supplier_id: data.supplier_id,
      p_title: isApproved ? '✅ Proposta Aprovada!' : '❌ Proposta Não Selecionada',
      p_message: `Sua proposta para "${data.quote_title}" foi ${isApproved ? 'aprovada' : 'não selecionada'}.`,
      p_type: isApproved ? 'success' : 'warning',
      p_priority: 'high',
      p_action_url: '/supplier/quotes',
      p_metadata: {
        quote_id: data.quote_id,
        local_code: data.local_code,
        status: data.status
      }
    });
  } catch (error) {
    console.error('Erro ao notificar fornecedor sobre status da proposta:', error);
  }
};