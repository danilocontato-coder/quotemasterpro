import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Hook para isolar completamente as notificações por dashboard
export function useDashboardNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  // Função para obter notificações específicas do dashboard atual
  const getCurrentDashboardNotifications = () => {
    if (!user?.role) return [];

    const dashboardNotifications = {
      // Dashboard Principal (Manager/Collaborator)
      manager: [
        {
          id: 'dash-mg-1',
          title: 'Cotação aprovada hoje',
          message: 'Você aprovou 3 cotações no valor total de R$ 8.750,00',
          type: 'success',
          time: 'Agora',
          priority: 'medium'
        },
        {
          id: 'dash-mg-2', 
          title: 'Pendências de aprovação',
          message: '5 cotações aguardam sua análise - 2 vencem hoje',
          type: 'warning',
          time: '15 min atrás',
          priority: 'high'
        }
      ],
      
      collaborator: [
        {
          id: 'dash-co-1',
          title: 'Suas cotações hoje',
          message: 'Você criou 2 cotações que estão em análise',
          type: 'info',
          time: '10 min atrás',
          priority: 'low'
        }
      ],

      // Super Admin Dashboard  
      super_admin: [
        {
          id: 'dash-sa-1',
          title: 'Performance do sistema',
          message: 'Uptime de 99.9% mantido. 1.234 usuários ativos hoje',
          type: 'success',
          time: 'Agora',
          priority: 'low'
        },
        {
          id: 'dash-sa-2',
          title: 'Alerta de capacidade',
          message: 'Servidor principal em 85% da capacidade',
          type: 'warning', 
          time: '5 min atrás',
          priority: 'high'
        }
      ],

      // Admin Dashboard
      admin: [
        {
          id: 'dash-ad-1',
          title: 'Novos cadastros hoje',
          message: '12 novos usuários e 3 empresas se cadastraram',
          type: 'info',
          time: '20 min atrás',
          priority: 'medium'
        }
      ],

      // Supplier Dashboard
      supplier: [
        {
          id: 'dash-sp-1',
          title: 'Oportunidades hoje',
          message: '4 novas solicitações de cotação disponíveis',
          type: 'info',
          time: '5 min atrás',
          priority: 'high'
        }
      ]
    };

    return dashboardNotifications[user.role as keyof typeof dashboardNotifications] || [];
  };

  useEffect(() => {
    if (user?.role) {
      const dashboardSpecificNotifications = getCurrentDashboardNotifications();
      setNotifications(dashboardSpecificNotifications);
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

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearDashboardNotifications: () => setNotifications([]),
    addDashboardNotification: (notification: any) => {
      setNotifications(prev => [notification, ...prev]);
    }
  };
}