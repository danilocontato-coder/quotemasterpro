import { useEffect, useRef } from 'react';
import { useSupabaseNotifications } from '@/hooks/useSupabaseNotifications';
import { useToast } from '@/hooks/use-toast';
import { Bell, CheckCircle, AlertTriangle, FileText, CreditCard, X, Truck } from 'lucide-react';

const getToastIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'error':
      return <X className="h-5 w-5 text-red-500" />;
    case 'proposal':
    case 'quote':
      return <FileText className="h-5 w-5 text-blue-500" />;
    case 'payment':
      return <CreditCard className="h-5 w-5 text-green-600" />;
    case 'delivery':
      return <Truck className="h-5 w-5 text-orange-500" />;
    case 'ticket':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    default:
      return <Bell className="h-5 w-5 text-blue-500" />;
  }
};

export function NotificationToast() {
  const { notifications } = useSupabaseNotifications();
  const { toast } = useToast();
  const shownNotificationsRef = useRef(new Set<string>());

  useEffect(() => {
    console.log('🍞 [TOAST] Checking notifications for toast display:', {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length
    });

    // Verificar por novas notificações não lidas
    notifications.forEach(notification => {
      if (!notification.read && !shownNotificationsRef.current.has(notification.id)) {
        // Verificar se é uma notificação recente (últimos 30 segundos)
        const now = new Date();
        const notificationTime = new Date(notification.created_at);
        const diffInSeconds = (now.getTime() - notificationTime.getTime()) / 1000;
        
        console.log('🍞 [TOAST] Checking notification:', {
          id: notification.id,
          title: notification.title,
          type: notification.type,
          diffInSeconds,
          isRecent: diffInSeconds <= 30
        });
        
        if (diffInSeconds <= 30) {
          console.log('🍞 [TOAST] Showing toast for notification:', notification.id);
          
          toast({
            title: notification.title,
            description: (
              <div className="flex items-center gap-2">
                {getToastIcon(notification.type)}
                <span>{notification.message}</span>
              </div>
            ),
            duration: notification.priority === 'high' ? 8000 : 5000,
          });

          // Marcar como exibida
          shownNotificationsRef.current.add(notification.id);
        }
      }
    });
  }, [notifications, toast]);

  return null; // Componente apenas para lógica, não renderiza nada
}