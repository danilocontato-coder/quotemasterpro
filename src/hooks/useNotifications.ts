import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Nova cotação recebida',
    message: 'Você recebeu uma nova proposta para "Material de Limpeza"',
    type: 'info',
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    actionUrl: '/quotes'
  },
  {
    id: '2',
    title: 'Pagamento confirmado',
    message: 'Pagamento de R$ 2.500,00 foi confirmado e liberado',
    type: 'success',
    read: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    actionUrl: '/payments'
  },
  {
    id: '3',
    title: 'Avaliação pendente',
    message: 'Avalie sua experiência com Fornecedor Alpha',
    type: 'warning',
    read: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  }
];

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const getRecentNotifications = useCallback((limit: number = 5) => {
    return notifications
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }, [notifications]);

  return {
    notifications,
    unreadCount: getUnreadCount(),
    recentNotifications: getRecentNotifications(),
    markAsRead,
    markAllAsRead,
    removeNotification,
  };
};