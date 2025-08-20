import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
  read: boolean;
  category: string;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
}

// Notificações específicas por papel
const getNotificationsByRole = (role: string): Notification[] => {
  const baseTime = new Date();
  
  switch (role) {
    case 'super_admin':
      return [
        {
          id: 'sa-1',
          title: 'Sistema de backup concluído',
          message: 'Backup automático das 03:00 executado com sucesso',
          type: 'success',
          time: '30 min atrás',
          read: false,
          category: 'sistema',
          priority: 'low',
        },
        {
          id: 'sa-2',
          title: 'Novo cliente aprovado',
          message: 'Condomínio Vista Alegre foi aprovado e ativado',
          type: 'info',
          time: '1 hora atrás',
          read: false,
          category: 'cliente',
          priority: 'medium',
          actionUrl: '/admin/clients'
        },
        {
          id: 'sa-3',
          title: 'Alerta de segurança',
          message: '3 tentativas de login falharam para admin@sistema.com',
          type: 'warning',
          time: '2 horas atrás',
          read: true,
          category: 'seguranca',
          priority: 'high',
          actionUrl: '/admin/security'
        },
        {
          id: 'sa-4',
          title: 'Integração WhatsApp offline',
          message: 'Serviço WhatsApp apresentou instabilidade',
          type: 'error',
          time: '4 horas atrás',
          read: false,
          category: 'integracao',
          priority: 'high',
          actionUrl: '/admin/integrations'
        }
      ];
      
    case 'admin':
      return [
        {
          id: 'ad-1',
          title: 'Limite de plano atingido',
          message: 'Cliente XYZ atingiu 95% do limite de cotações',
          type: 'warning',
          time: '15 min atrás',
          read: false,
          category: 'limite',
          priority: 'medium',
          actionUrl: '/admin/plans'
        },
        {
          id: 'ad-2',
          title: 'Novo fornecedor pendente',
          message: 'TechFlow Solutions aguarda aprovação',
          type: 'info',
          time: '45 min atrás',
          read: false,
          category: 'fornecedor',
          priority: 'medium',
          actionUrl: '/admin/suppliers'
        },
        {
          id: 'ad-3',
          title: 'Pagamento processado',
          message: 'Fatura #2024-001 paga com sucesso - R$ 1.299,00',
          type: 'success',
          time: '2 horas atrás',
          read: true,
          category: 'financeiro',
          priority: 'low'
        }
      ];
      
    case 'manager':
      return [
        {
          id: 'mg-1',
          title: 'Cotação aprovada',
          message: 'Cotação #QT-2024-156 foi aprovada - R$ 3.450,00',
          type: 'success',
          time: '10 min atrás',
          read: false,
          category: 'cotacao',
          priority: 'medium',
          actionUrl: '/quotes'
        },
        {
          id: 'mg-2',
          title: 'Nova proposta recebida',
          message: 'Fornecedor Alpha enviou proposta para "Material de limpeza"',
          type: 'info',
          time: '30 min atrás',
          read: false,
          category: 'cotacao',
          priority: 'medium',
          actionUrl: '/quotes'
        },
        {
          id: 'mg-3',
          title: 'Aprovação pendente',
          message: 'Cotação #QT-2024-157 aguarda sua aprovação',
          type: 'warning',
          time: '1 hora atrás',
          read: true,
          category: 'aprovacao',
          priority: 'high',
          actionUrl: '/approvals'
        }
      ];
      
    case 'collaborator':
      return [
        {
          id: 'co-1',
          title: 'Cotação enviada com sucesso',
          message: 'Sua cotação #QT-2024-158 foi enviada para aprovação',
          type: 'success',
          time: '5 min atrás',
          read: false,
          category: 'cotacao',
          priority: 'low'
        },
        {
          id: 'co-2',
          title: 'Cotação rejeitada',
          message: 'Cotação #QT-2024-155 foi rejeitada. Verifique os comentários.',
          type: 'error',
          time: '2 horas atrás',
          read: false,
          category: 'cotacao',
          priority: 'high',
          actionUrl: '/quotes'
        }
      ];
      
    case 'supplier':
      return [
        {
          id: 'sp-1',
          title: 'Nova solicitação de cotação',
          message: 'Condomínio ABC solicitou cotação para "Materiais elétricos"',
          type: 'info',
          time: '20 min atrás',
          read: false,
          category: 'cotacao',
          priority: 'high',
          actionUrl: '/supplier/quotes'
        },
        {
          id: 'sp-2',
          title: 'Proposta aceita',
          message: 'Sua proposta #PR-2024-089 foi aceita - R$ 2.100,00',
          type: 'success',
          time: '1 hora atrás',
          read: false,
          category: 'proposta',
          priority: 'medium'
        },
        {
          id: 'sp-3',
          title: 'Estoque baixo',
          message: 'Produto "Cabo elétrico 2.5mm" com apenas 12 unidades',
          type: 'warning',
          time: '3 horas atrás',
          read: true,
          category: 'estoque',
          priority: 'medium',
          actionUrl: '/supplier/products'
        }
      ];
      
    default:
      return [];
  }
};

export function useRoleBasedNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (user?.role) {
      const roleNotifications = getNotificationsByRole(user.role);
      setNotifications(roleNotifications);
    }
  }, [user?.role]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const newNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const highPriorityCount = notifications.filter(n => !n.read && n.priority === 'high').length;

  // Métodos para Supabase (preparados para integração)
  const syncWithSupabase = async () => {
    // TODO: Implementar sincronização com Supabase
    console.log('Sync notifications with Supabase - Ready for implementation');
  };

  const subscribeToRealtime = () => {
    // TODO: Subscribe to Supabase realtime notifications
    console.log('Subscribe to realtime notifications - Ready for Supabase');
  };

  return {
    notifications,
    unreadCount,
    highPriorityCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    syncWithSupabase,
    subscribeToRealtime,
  };
}