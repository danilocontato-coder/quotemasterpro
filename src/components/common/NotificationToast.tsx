import { useEffect } from 'react';
import { useSupabaseNotifications } from '@/hooks/useSupabaseNotifications';
import { useToast } from '@/hooks/use-toast';
import { Bell, CheckCircle, AlertTriangle, FileText, CreditCard, X } from 'lucide-react';

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
    case 'ticket':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    default:
      return <Bell className="h-5 w-5 text-blue-500" />;
  }
};

export function NotificationToast() {
  const { notifications } = useSupabaseNotifications();
  const { toast } = useToast();

  useEffect(() => {
    // Monitorar por novas notificações e mostrar toast
    const latestNotification = notifications[0];
    
    if (latestNotification && !latestNotification.read) {
      // Verificar se é uma notificação muito recente (últimos 10 segundos)
      const now = new Date();
      const notificationTime = new Date(latestNotification.created_at);
      const diffInSeconds = (now.getTime() - notificationTime.getTime()) / 1000;
      
      if (diffInSeconds <= 10) {
        toast({
          title: latestNotification.title,
          description: (
            <div className="flex items-center gap-2">
              {getToastIcon(latestNotification.type)}
              <span>{latestNotification.message}</span>
            </div>
          ),
          duration: latestNotification.priority === 'high' ? 8000 : 5000,
        });
      }
    }
  }, [notifications, toast]);

  return null; // Componente apenas para lógica, não renderiza nada
}