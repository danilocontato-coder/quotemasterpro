import { useState } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Nova cotação recebida',
    message: 'Fornecedor Alpha enviou proposta para "Material de limpeza"',
    type: 'info',
    time: '2 min atrás',
    read: false,
  },
  {
    id: '2',
    title: 'Pagamento confirmado',
    message: 'Pagamento de R$ 2.450,00 foi processado com sucesso',
    type: 'success',
    time: '1 hora atrás',
    read: false,
  },
  {
    id: '3',
    title: 'Cotação vencendo',
    message: 'Cotação "Materiais elétricos" vence em 2 dias',
    type: 'warning',
    time: '3 horas atrás',
    read: true,
  },
];

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

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

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}