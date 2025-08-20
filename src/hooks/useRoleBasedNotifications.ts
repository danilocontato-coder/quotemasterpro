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

// Notificações específicas e exclusivas por papel
const getNotificationsByRole = (role: string): Notification[] => {
  const baseTime = new Date();
  
  switch (role) {
    case 'super_admin':
      return [
        {
          id: 'sa-1',
          title: 'Sistema de backup concluído',
          message: 'Backup automático das 03:00 executado com sucesso em todos os servidores',
          type: 'success',
          time: '30 min atrás',
          read: false,
          category: 'sistema',
          priority: 'low',
        },
        {
          id: 'sa-2',
          title: 'Novo cliente aprovado',
          message: 'Condomínio Vista Alegre foi aprovado e ativado no sistema',
          type: 'info',
          time: '1 hora atrás',
          read: false,
          category: 'cliente',
          priority: 'medium',
          actionUrl: '/admin/clients'
        },
        {
          id: 'sa-3',
          title: 'Alerta de segurança crítico',
          message: '3 tentativas de login falharam para admin@sistema.com - IP bloqueado',
          type: 'warning',
          time: '2 horas atrás',
          read: false,
          category: 'seguranca',
          priority: 'high',
          actionUrl: '/admin/security'
        },
        {
          id: 'sa-4',
          title: 'Integração WhatsApp offline',
          message: 'Serviço WhatsApp Business API apresentou instabilidade - verificar configuração',
          type: 'error',
          time: '4 horas atrás',
          read: false,
          category: 'integracao',
          priority: 'high',
          actionUrl: '/admin/integrations'
        },
        {
          id: 'sa-5',
          title: 'Relatório mensal gerado',
          message: 'Relatório de receitas e usuários de Julho/2024 disponível para download',
          type: 'success',
          time: '6 horas atrás',
          read: true,
          category: 'relatorio',
          priority: 'low'
        }
      ];
      
    case 'admin':
      return [
        {
          id: 'ad-1',
          title: 'Limite de plano atingido',
          message: 'Cliente Condomínio XYZ atingiu 95% do limite de cotações do plano Pro',
          type: 'warning',
          time: '15 min atrás',
          read: false,
          category: 'limite',
          priority: 'medium',
          actionUrl: '/admin/plans'
        },
        {
          id: 'ad-2',
          title: 'Novo fornecedor aguarda aprovação',
          message: 'TechFlow Solutions enviou solicitação de cadastro como fornecedor',
          type: 'info',
          time: '45 min atrás',
          read: false,
          category: 'fornecedor',
          priority: 'medium',
          actionUrl: '/admin/suppliers'
        },
        {
          id: 'ad-3',
          title: 'Pagamento processado com sucesso',
          message: 'Fatura #2024-001 paga automaticamente via Stripe - R$ 1.299,00',
          type: 'success',
          time: '2 horas atrás',
          read: true,
          category: 'financeiro',
          priority: 'low'
        },
        {
          id: 'ad-4',
          title: 'Upgrade de plano solicitado',
          message: 'Cliente Edifício Central solicitou upgrade para plano Enterprise',
          type: 'info',
          time: '3 horas atrás',
          read: false,
          category: 'plano',
          priority: 'medium',
          actionUrl: '/admin/plans'
        }
      ];
      
    case 'manager':
      return [
        {
          id: 'mg-1',
          title: 'Cotação #QT-2024-156 aprovada',
          message: 'Cotação para "Material de construção" aprovada pelo gestor - Valor: R$ 3.450,00',
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
          message: 'Fornecedor Alpha Materiais enviou proposta para "Kit de limpeza mensal"',
          type: 'info',
          time: '30 min atrás',
          read: false,
          category: 'cotacao',
          priority: 'medium',
          actionUrl: '/quotes'
        },
        {
          id: 'mg-3',
          title: 'Aprovação urgente necessária',
          message: 'Cotação #QT-2024-157 para serviços de emergência aguarda sua aprovação',
          type: 'warning',
          time: '1 hora atrás',
          read: false,
          category: 'aprovacao',
          priority: 'high',
          actionUrl: '/approvals'
        },
        {
          id: 'mg-4',
          title: 'Orçamento mensal atingido',
          message: 'Gastos do mês atingiram 85% do orçamento aprovado para sua unidade',
          type: 'warning',
          time: '2 horas atrás',
          read: true,
          category: 'orcamento',
          priority: 'medium'
        }
      ];
      
    case 'collaborator':
      return [
        {
          id: 'co-1',
          title: 'Cotação #QT-2024-158 enviada',
          message: 'Sua cotação para "Equipamentos de segurança" foi enviada para aprovação do gestor',
          type: 'success',
          time: '5 min atrás',
          read: false,
          category: 'cotacao',
          priority: 'low'
        },
        {
          id: 'co-2',
          title: 'Cotação #QT-2024-155 rejeitada',
          message: 'Cotação rejeitada: "Valores acima do orçamento". Verifique os comentários do gestor.',
          type: 'error',
          time: '2 horas atrás',
          read: false,
          category: 'cotacao',
          priority: 'high',
          actionUrl: '/quotes'
        },
        {
          id: 'co-3',
          title: 'Novo fornecedor disponível',
          message: 'Fornecedor "Beta Suprimentos" foi aprovado e está disponível para cotações',
          type: 'info',
          time: '4 horas atrás',
          read: true,
          category: 'fornecedor',
          priority: 'low'
        }
      ];
      
    case 'supplier':
      return [
        {
          id: 'sp-1',
          title: 'Nova solicitação de cotação',
          message: 'Condomínio ABC solicitou cotação para "Materiais elétricos" - Prazo: 48h',
          type: 'info',
          time: '20 min atrás',
          read: false,
          category: 'cotacao',
          priority: 'high',
          actionUrl: '/supplier/quotes'
        },
        {
          id: 'sp-2',
          title: 'Proposta #PR-2024-089 aceita',
          message: 'Sua proposta foi aceita! Pagamento de R$ 2.100,00 será processado em 5 dias úteis',
          type: 'success',
          time: '1 hora atrás',
          read: false,
          category: 'proposta',
          priority: 'medium'
        },
        {
          id: 'sp-3',
          title: 'Alerta de estoque baixo',
          message: 'Produto "Cabo elétrico 2.5mm" com apenas 12 unidades restantes',
          type: 'warning',
          time: '3 horas atrás',
          read: false,
          category: 'estoque',
          priority: 'medium',
          actionUrl: '/supplier/products'
        },
        {
          id: 'sp-4',
          title: 'Avaliação recebida',
          message: 'Cliente avaliou seu atendimento com 5 estrelas. Parabéns!',
          type: 'success',
          time: '5 horas atrás',
          read: true,
          category: 'avaliacao',
          priority: 'low'
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