import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

interface SuperAdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'system' | 'alert' | 'info' | 'warning' | 'success';
  priority: 'low' | 'normal' | 'high' | 'critical';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: any;
}

export const useSuperAdminNotifications = () => {
  const [notifications, setNotifications] = useState<SuperAdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const generateNotifications = async (): Promise<SuperAdminNotification[]> => {
    try {
      const generatedNotifications: SuperAdminNotification[] = [];
      
      // Verificar tickets urgentes
      const { data: urgentTickets } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('priority', 'urgent')
        .eq('status', 'novo')
        .order('created_at', { ascending: false })
        .limit(5);

      urgentTickets?.forEach(ticket => {
        generatedNotifications.push({
          id: `ticket-${ticket.id}`,
          title: 'Ticket Urgente',
          message: `Ticket #${ticket.id}: ${ticket.subject}`,
          type: 'alert',
          priority: 'critical',
          timestamp: new Date(ticket.created_at),
          read: false,
          actionUrl: '/admin/communication',
          metadata: { ticketId: ticket.id }
        });
      });

      // Verificar novos usuários nas últimas 24h
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data: newUsers } = await supabase
        .from('profiles')
        .select('*')
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false });

      if (newUsers && newUsers.length > 0) {
        generatedNotifications.push({
          id: 'new-users-24h',
          title: 'Novos Usuários',
          message: `${newUsers.length} novos usuários registrados nas últimas 24h`,
          type: 'info',
          priority: 'normal',
          timestamp: new Date(),
          read: false,
          actionUrl: '/admin/users'
        });
      }

      // Verificar cotações com muitas respostas (alta atividade)
      const { data: activeQuotes } = await supabase
        .from('quotes')
        .select('*')
        .gte('responses_count', 5)
        .eq('status', 'receiving')
        .order('responses_count', { ascending: false })
        .limit(3);

      activeQuotes?.forEach(quote => {
        generatedNotifications.push({
          id: `quote-activity-${quote.id}`,
          title: 'Alta Atividade na Cotação',
          message: `Cotação #${quote.local_code || quote.id} recebeu ${quote.responses_count} propostas`,
          type: 'success',
          priority: 'normal',
          timestamp: new Date(quote.updated_at),
          read: false,
          actionUrl: '/quotes'
        });
      });

      // Verificar pagamentos pendentes há mais de 7 dias
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: pendingPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'pending')
        .lt('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: true })
        .limit(5);

      pendingPayments?.forEach(payment => {
        generatedNotifications.push({
          id: `payment-pending-${payment.id}`,
          title: 'Pagamento Pendente',
          message: `Pagamento #${payment.id} pendente há mais de 7 dias`,
          type: 'warning',
          priority: 'high',
          timestamp: new Date(payment.created_at),
          read: false,
          actionUrl: '/payments'
        });
      });

      // Verificar fornecedores inativos
      const { data: inactiveSuppliers } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(3);

      if (inactiveSuppliers && inactiveSuppliers.length > 0) {
        generatedNotifications.push({
          id: 'inactive-suppliers',
          title: 'Fornecedores Pendentes',
          message: `${inactiveSuppliers.length} fornecedores aguardando aprovação`,
          type: 'warning',
          priority: 'normal',
          timestamp: new Date(),
          read: false,
          actionUrl: '/admin/suppliers'
        });
      }

      // Verificar uso de storage alto
      const { data: clientUsage } = await supabase
        .from('client_usage')
        .select('*, clients(name)')
        .gte('storage_used_gb', 8)
        .order('storage_used_gb', { ascending: false })
        .limit(3);

      clientUsage?.forEach(usage => {
        generatedNotifications.push({
          id: `storage-${usage.client_id}`,
          title: 'Alto Uso de Storage',
          message: `Cliente ${usage.clients?.name || 'N/A'} usando ${usage.storage_used_gb}GB`,
          type: 'warning',
          priority: 'normal',
          timestamp: new Date(),
          read: false,
          actionUrl: '/admin/clients'
        });
      });

      return generatedNotifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Erro ao gerar notificações:', error);
      return [];
    }
  };

  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      const realNotifications = await generateNotifications();
      setNotifications(realNotifications);
      setUnreadCount(realNotifications.filter(n => !n.read).length);
      setIsLoading(false);
      
      // Mostrar toast para notificações críticas
      realNotifications.forEach(notification => {
        if (notification.priority === 'critical' && !notification.read) {
          toast.error(notification.title, {
            description: notification.message,
            duration: 10000,
          });
        }
      });
    };

    loadNotifications();

    // Configurar realtime para atualizações
    const channel = supabase
      .channel('super-admin-notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_tickets'
      }, () => {
        loadNotifications();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quotes'
      }, () => {
        loadNotifications();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments'
      }, () => {
        loadNotifications();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'profiles'
      }, () => {
        loadNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true }
        : notification
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (notificationId: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
    setUnreadCount(prev => {
      const notification = notifications.find(n => n.id === notificationId);
      return notification && !notification.read ? Math.max(0, prev - 1) : prev;
    });
  };

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: async () => {
      setIsLoading(true);
      const realNotifications = await generateNotifications();
      setNotifications(realNotifications);
      setUnreadCount(realNotifications.filter(n => !n.read).length);
      setIsLoading(false);
    }
  };
};