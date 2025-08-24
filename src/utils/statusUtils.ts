// Status utility functions for quotes
export const getStatusText = (status: string) => {
  switch (status) {
    case 'draft': return 'Rascunho';
    case 'sent': return 'Enviada';
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
    case 'under_review': return 'bg-yellow-100 text-yellow-800';
    case 'approved': return 'bg-green-100 text-green-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    case 'finalized': return 'bg-purple-100 text-purple-800';
    case 'cancelled': return 'bg-gray-100 text-gray-800';
    case 'trash': return 'bg-gray-100 text-gray-500';
    default: return 'bg-gray-100 text-gray-800';
  }
};