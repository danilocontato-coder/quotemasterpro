// DEPRECATED: Use useSupabaseSupplierHistory instead
import { useState, useCallback } from 'react';

export interface SupplierHistoryLog {
  id: string;
  actionType: string;
  description: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
}

// Mock data
const mockHistoryLogs: SupplierHistoryLog[] = [
  {
    id: '1',
    actionType: 'product_created',
    description: 'Novo produto "Cimento Portland 50kg" foi adicionado ao catálogo',
    entityType: 'product',
    entityId: 'PROD001',
    details: { productName: 'Cimento Portland 50kg', category: 'Materiais de Construção' },
    createdAt: '2025-08-20T10:30:00Z',
  },
  {
    id: '2',
    actionType: 'quote_responded',
    description: 'Proposta enviada para cotação RFQ009',
    entityType: 'quote',
    entityId: 'RFQ009',
    details: { clientName: 'Condomínio Jardim das Flores', proposalValue: 3500.00 },
    createdAt: '2025-08-20T09:15:00Z',
  },
  {
    id: '3',
    actionType: 'payment_received',
    description: 'Pagamento de R$ 3.500,00 recebido da cotação RFQ009',
    entityType: 'payment',
    entityId: 'PAY001',
    details: { amount: 3500.00, paymentMethod: 'Cartão de Crédito', quoteId: 'RFQ009' },
    createdAt: '2025-08-19T14:20:00Z',
  },
  {
    id: '4',
    actionType: 'product_updated',
    description: 'Estoque do produto "Areia Fina (m³)" foi atualizado',
    entityType: 'product',
    entityId: 'PROD002',
    details: { oldStock: 20, newStock: 25, movementType: 'in' },
    createdAt: '2025-08-19T11:45:00Z',
  },
  {
    id: '5',
    actionType: 'quote_viewed',
    description: 'Cotação RFQ008 foi visualizada',
    entityType: 'quote',
    entityId: 'RFQ008',
    details: { clientName: 'Residencial Vista Alegre' },
    createdAt: '2025-08-19T08:30:00Z',
  },
  {
    id: '6',
    actionType: 'profile_updated',
    description: 'Informações do perfil foram atualizadas',
    entityType: 'profile',
    entityId: 'PROFILE001',
    details: { updatedFields: ['phone', 'address'] },
    createdAt: '2025-08-18T16:00:00Z',
  },
  {
    id: '7',
    actionType: 'product_deleted',
    description: 'Produto "Produto Teste" foi removido do catálogo',
    entityType: 'product',
    entityId: 'PROD999',
    details: { productName: 'Produto Teste', reason: 'Produto descontinuado' },
    createdAt: '2025-08-18T13:20:00Z',
  },
  {
    id: '8',
    actionType: 'settings_changed',
    description: 'Configurações de notificação foram alteradas',
    entityType: 'settings',
    entityId: 'SETTINGS001',
    details: { emailNotifications: true, whatsappNotifications: false },
    createdAt: '2025-08-17T15:10:00Z',
  },
  {
    id: '9',
    actionType: 'client_interaction',
    description: 'Mensagem enviada para cliente do Condomínio Sol Nascente',
    entityType: 'message',
    entityId: 'MSG001',
    details: { clientName: 'Condomínio Sol Nascente', messageType: 'quote_clarification' },
    createdAt: '2025-08-17T10:45:00Z',
  },
  {
    id: '10',
    actionType: 'quote_responded',
    description: 'Proposta enviada para cotação RFQ007',
    entityType: 'quote',
    entityId: 'RFQ007',
    details: { clientName: 'Condomínio Jardim das Flores', proposalValue: 1200.00 },
    createdAt: '2025-08-16T14:30:00Z',
  },
];

let historyStore: SupplierHistoryLog[] = [...mockHistoryLogs];

export const useSupplierHistory = () => {
  const [historyLogs, setHistoryLogs] = useState<SupplierHistoryLog[]>(historyStore);
  const [isLoading, setIsLoading] = useState(false);

  const addHistoryLog = useCallback(async (logData: Omit<SupplierHistoryLog, 'id' | 'createdAt'>) => {
    const newLog: SupplierHistoryLog = {
      ...logData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    historyStore = [newLog, ...historyStore];
    setHistoryLogs([...historyStore]);
    
    return newLog;
  }, []);

  const getLogsByActionType = useCallback((actionType: string) => {
    return historyLogs.filter(log => log.actionType === actionType);
  }, [historyLogs]);

  const getLogsByDateRange = useCallback((startDate: Date, endDate: Date) => {
    return historyLogs.filter(log => {
      const logDate = new Date(log.createdAt);
      return logDate >= startDate && logDate <= endDate;
    });
  }, [historyLogs]);

  const getLogsByEntity = useCallback((entityType: string, entityId: string) => {
    return historyLogs.filter(log => 
      log.entityType === entityType && log.entityId === entityId
    );
  }, [historyLogs]);

  const exportHistory = useCallback((format: 'csv' | 'pdf' = 'csv') => {
    setIsLoading(true);
    try {
      // Mock export functionality
      console.log(`Exporting history in ${format} format`);
      
      if (format === 'csv') {
        const csvContent = [
          'Data,Ação,Descrição,Entidade,ID da Entidade',
          ...historyLogs.map(log => 
            `"${new Date(log.createdAt).toLocaleString('pt-BR')}","${log.actionType}","${log.description}","${log.entityType}","${log.entityId}"`
          )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `historico-atividades-${new Date().toISOString().split('T')[0]}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [historyLogs]);

  const clearHistory = useCallback(async (daysOld: number = 365) => {
    setIsLoading(true);
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      historyStore = historyStore.filter(log => new Date(log.createdAt) >= cutoffDate);
      setHistoryLogs([...historyStore]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    historyLogs,
    isLoading,
    addHistoryLog,
    getLogsByActionType,
    getLogsByDateRange,
    getLogsByEntity,
    exportHistory,
    clearHistory,
  };
};