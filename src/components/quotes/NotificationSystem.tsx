import React from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Bell, Mail, MessageCircle, Check } from 'lucide-react';

export interface NotificationData {
  type: 'email' | 'whatsapp' | 'system';
  recipient: string;
  subject: string;
  message: string;
  quoteId: string;
  quoteName: string;
}

class NotificationService {
  private static instance: NotificationService;
  private notifications: NotificationData[] = [];

  static getInstance() {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async sendApprovalNotification(quoteId: string, quoteName: string, supplierEmail: string, supplierPhone?: string) {
    const notifications: NotificationData[] = [];

    // Email notification
    const emailNotification: NotificationData = {
      type: 'email',
      recipient: supplierEmail,
      subject: `Cotação Aprovada - ${quoteName}`,
      message: `Sua cotação "${quoteName}" foi aprovada! Por favor, proceda com o envio do orçamento detalhado em PDF.`,
      quoteId,
      quoteName
    };

    // WhatsApp notification (if phone available)
    if (supplierPhone) {
      const whatsappNotification: NotificationData = {
        type: 'whatsapp',
        recipient: supplierPhone,
        subject: 'Cotação Aprovada',
        message: `Olá! Sua cotação "${quoteName}" foi aprovada. Envie o orçamento em PDF para finalizar.`,
        quoteId,
        quoteName
      };
      notifications.push(whatsappNotification);
    }

    notifications.push(emailNotification);

    // Simulate sending notifications
    for (const notification of notifications) {
      await this.simulateSendNotification(notification);
      this.notifications.push(notification);
    }

    return notifications;
  }

  private async simulateSendNotification(notification: NotificationData): Promise<boolean> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`📧 ${notification.type.toUpperCase()} sent to ${notification.recipient}:`, {
      subject: notification.subject,
      message: notification.message,
      quoteId: notification.quoteId
    });

    return true;
  }

  getNotificationHistory() {
    return this.notifications;
  }
}

export const notificationService = NotificationService.getInstance();

interface NotificationStatusProps {
  notifications: NotificationData[];
  onClose: () => void;
}

export function NotificationStatus({ notifications, onClose }: NotificationStatusProps) {
  const { toast } = useToast();

  React.useEffect(() => {
    if (notifications.length > 0) {
      toast({
        title: "Notificações Enviadas",
        description: `${notifications.length} notificação(ões) enviada(s) para o fornecedor`,
        duration: 3000,
      });
      
      setTimeout(onClose, 3000);
    }
  }, [notifications, toast, onClose]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-green-600" />
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-sm">Notificações Enviadas</h4>
          <div className="mt-2 space-y-1">
            {notifications.map((notification, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                {notification.type === 'email' && <Mail className="w-3 h-3" />}
                {notification.type === 'whatsapp' && <MessageCircle className="w-3 h-3" />}
                {notification.type === 'system' && <Bell className="w-3 h-3" />}
                <span>{notification.type === 'email' ? 'Email' : 'WhatsApp'} para {notification.recipient}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}