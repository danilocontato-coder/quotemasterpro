// Status utility functions for quotes
export const getStatusText = (status: string) => {
  switch (status) {
    case 'draft': return 'Rascunho';
    case 'sent': return 'Enviada';
    case 'receiving': return 'Recebendo Propostas';
    case 'under_review': return 'Em Análise';
    case 'approved': return 'Aprovada';
    case 'rejected': return 'Rejeitada';
    case 'finalized': return 'Finalizada';
    case 'cancelled': return 'Cancelada';
    case 'trash': return 'Lixeira';
    default: return status;
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800';
    case 'sent': return 'bg-blue-100 text-blue-800';
    case 'receiving': return 'bg-cyan-100 text-cyan-800';
    case 'under_review': return 'bg-yellow-100 text-yellow-800';
    case 'approved': return 'bg-green-100 text-green-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    case 'finalized': return 'bg-purple-100 text-purple-800';
    case 'cancelled': return 'bg-gray-100 text-gray-800';
    case 'trash': return 'bg-gray-100 text-gray-500';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Status transitions and validations
export const getValidStatusTransitions = (currentStatus: string): string[] => {
  switch (currentStatus) {
    case 'draft':
      return ['sent', 'cancelled'];
    case 'sent':
      return ['receiving', 'cancelled'];
    case 'receiving':
      return ['under_review', 'cancelled'];
    case 'under_review':
      return ['approved', 'rejected', 'receiving'];
    case 'approved':
      return ['finalized', 'cancelled'];
    case 'rejected':
      return ['receiving', 'cancelled'];
    case 'finalized':
      return [];
    case 'cancelled':
      return [];
    default:
      return [];
  }
};

// Função para verificar se uma transição de status é válida
export const isValidStatusTransition = (currentStatus: string, newStatus: string): boolean => {
  const validTransitions = getValidStatusTransitions(currentStatus);
  return validTransitions.includes(newStatus);
};

// Função para obter o próximo status automático baseado na lógica de negócio
export const getNextAutomaticStatus = (currentStatus: string, context?: any): string | null => {
  switch (currentStatus) {
    case 'receiving':
      // Se todas as propostas foram recebidas, pode ir para under_review
      if (context?.allProposalsReceived) {
        return 'under_review';
      }
      return null;
    case 'under_review':
      // Após aprovação/rejeição, o status é atualizado pelo ApprovalService
      return null;
    case 'approved':
      // Após aprovação, pode ser finalizada (mas precisa verificar se não requer aprovação adicional)
      return null;
    default:
      return null;
  }
};