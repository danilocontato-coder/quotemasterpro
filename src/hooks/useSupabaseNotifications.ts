import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'proposal' | 'delivery' | 'payment' | 'quote' | 'ticket';
  created_at: string;
  read: boolean;
  priority: 'low' | 'normal' | 'high';
  action_url?: string;
  metadata?: Json;
}

export function useSupabaseNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!user) {
      console.log('🔔 [NOTIFICATIONS] No user found, clearing notifications');
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔔 [NOTIFICATIONS] Fetching notifications for user:', user.id);

      // Buscar client_id e supplier_id do usuário para incluir notificações broadcast
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id, supplier_id')
        .eq('id', user.id)
        .single();

      const clientId = profile?.client_id;
      const supplierId = profile?.supplier_id;
      console.log('🔔 [NOTIFICATIONS] User client_id:', clientId, 'supplier_id:', supplierId);

      // Buscar notificações próprias do usuário OU broadcast para seu cliente/fornecedor
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Construir filtro dinâmico (incluindo LEGACY FIX para notificações antigas)
      const filters: string[] = [`user_id.eq.${user.id}`];
      if (clientId) {
        filters.push(`client_id.eq.${clientId}`);
      }
      if (supplierId) {
        filters.push(`supplier_id.eq.${supplierId}`);
        // LEGACY FIX: resgatar notificações antigas gravadas incorretamente
        filters.push(`user_id.eq.${supplierId}`);
      }

      query = query.or(filters.join(','));

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('🔔 [NOTIFICATIONS] No notifications found');
        setNotifications([]);
        setIsLoading(false);
        return;
      }

      // Buscar estados de dismiss/read para estas notificações
      const notificationIds = data.map(n => n.id);
      const { data: statesData } = await supabase
        .from('notification_user_states')
        .select('*')
        .in('notification_id', notificationIds)
        .eq('user_id', user.id);

      console.log('🔔 [NOTIFICATIONS] User states:', statesData?.length || 0);

      // Criar mapa de estados
      const statesMap = new Map(
        (statesData || []).map(state => [state.notification_id, state])
      );

      // Filtrar dismissed e aplicar read status
      const processedNotifications = data
        .filter(notif => {
          const state = statesMap.get(notif.id);
          return !state?.dismissed; // Filtrar dismissed
        })
        .map(notification => {
          const state = statesMap.get(notification.id);
          return {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type as 'info' | 'success' | 'warning' | 'error' | 'proposal' | 'delivery' | 'payment' | 'quote' | 'ticket',
            created_at: notification.created_at,
            read: state?.read ?? notification.read, // Usar estado se existir
            priority: notification.priority as 'low' | 'normal' | 'high',
            action_url: notification.action_url,
            metadata: notification.metadata,
          };
        });

      console.log('🔔 [NOTIFICATIONS] Processed:', {
        fetched: data.length,
        visible: processedNotifications.length,
        unread: processedNotifications.filter(n => !n.read).length,
      });

      setNotifications(processedNotifications);
    } catch (err) {
      console.error('❌ [NOTIFICATIONS] Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar notificações');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Subscribe to real-time updates with immediate toast notifications
  useEffect(() => {
    if (!user) return;

    console.log('🔔 [NOTIFICATIONS] Setting up real-time subscription for user:', user.id);

    // Buscar client_id e supplier_id para incluir no filtro realtime
    const setupSubscription = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id, supplier_id')
        .eq('id', user.id)
        .single();

      const clientId = profile?.client_id;
      const supplierId = profile?.supplier_id;

      // Handlers de INSERT e UPDATE reutilizáveis
      const handleInsert = (payload: any) => {
        console.log('🔔 [NOTIFICATIONS] New notification received:', payload);
        
        const newNotification = payload.new as any;
        
        // Show immediate toast for new notification
        toast(newNotification.title, {
          description: newNotification.message,
          duration: newNotification.priority === 'high' ? 8000 : 5000,
          action: newNotification.action_url ? {
            label: 'Ver',
            onClick: () => {
              if (newNotification.action_url) {
                window.dispatchEvent(new CustomEvent('navigate-to', { detail: newNotification.action_url }));
              }
            }
          } : undefined
        });

        // Add notification to state immediately
        const formattedNotification = {
          id: newNotification.id,
          title: newNotification.title,
          message: newNotification.message,
          type: newNotification.type as 'info' | 'success' | 'warning' | 'error' | 'proposal' | 'delivery' | 'payment' | 'quote' | 'ticket',
          created_at: newNotification.created_at,
          read: false,
          priority: newNotification.priority as 'low' | 'normal' | 'high',
          action_url: newNotification.action_url,
          metadata: newNotification.metadata,
        };

        setNotifications(prev => [formattedNotification, ...prev]);
      };

      const handleUpdate = (payload: any) => {
        console.log('🔔 [NOTIFICATIONS] Notification updated:', payload);
        
        const updatedNotification = payload.new as any;
        setNotifications(prev => 
          prev.map(n => 
            n.id === updatedNotification.id 
              ? { ...n, read: updatedNotification.read }
              : n
          )
        );
      };

      // CORRIGIDO: usar múltiplos listeners específicos em vez de um único com filtro combinado
      const channel = supabase.channel(`notifications-main-${user.id}`);
      
      // Listener principal: notificações diretas do usuário
      channel.on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${user.id}` 
      }, handleInsert);
      
      channel.on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${user.id}` 
      }, handleUpdate);

      // Se houver clientId: broadcast para cliente
      if (clientId) {
        channel.on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `client_id=eq.${clientId}` 
        }, handleInsert);
        
        channel.on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'notifications', 
          filter: `client_id=eq.${clientId}` 
        }, handleUpdate);
      }

      // Se houver supplierId: broadcast para fornecedor
      if (supplierId) {
        channel.on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `supplier_id=eq.${supplierId}` 
        }, handleInsert);
        
        channel.on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'notifications', 
          filter: `supplier_id=eq.${supplierId}` 
        }, handleUpdate);

        // LEGACY FIX: notificações antigas gravadas incorretamente (user_id = supplierId)
        channel.on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${supplierId}` 
        }, handleInsert);
        
        channel.on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${supplierId}` 
        }, handleUpdate);
      }

      channel.subscribe((status) => {
        console.log('🔔 [NOTIFICATIONS] Real-time subscription status:', status);
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.error('🔔 [NOTIFICATIONS] Subscription error:', status);
        }
      });

      return () => {
        console.log('🔔 [NOTIFICATIONS] Cleaning up real-time subscription');
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [user?.id]); // Changed dependency to be more specific

  const markAsRead = async (id: string) => {
    try {
      const notification = notifications.find(n => n.id === id);
      
      if (notification) {
        // Sempre usar estados para consistência
        const { error } = await supabase
          .from('notification_user_states')
          .upsert({
            notification_id: id,
            user_id: user?.id,
            read: true,
            dismissed: false
          }, { 
            onConflict: 'notification_id,user_id' 
          });

        if (error) throw error;
      }

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      // Usar estados para consistência
      const states = unreadIds.map(id => ({
        notification_id: id,
        user_id: user?.id,
        read: true,
        dismissed: false
      }));

      const { error } = await supabase
        .from('notification_user_states')
        .upsert(states, { 
          onConflict: 'notification_id,user_id' 
        });

      if (error) throw error;

      console.log('✅ [NOTIFICATIONS] Marked all as read:', unreadIds.length, 'notifications');

      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      toast.success('Todas as notificações foram marcadas como lidas');
    } catch (err) {
      console.error('❌ [NOTIFICATIONS] Error marking all as read:', err);
      toast.error('Erro ao marcar notificações como lidas');
    }
  };

  const clearAllNotifications = async () => {
    if (!user?.id) return;

    try {
      console.log('🔔 [NOTIFICATIONS] Starting clear for user:', user.id);
      
      // Marcar TODAS as notificações visíveis como dismissed
      const visibleIds = notifications.map(n => n.id);
      
      if (visibleIds.length === 0) {
        toast.info('Nenhuma notificação para limpar');
        return;
      }

      const states = visibleIds.map(id => ({
        notification_id: id,
        user_id: user.id,
        read: true,
        dismissed: true
      }));

      const { error } = await supabase
        .from('notification_user_states')
        .upsert(states, { 
          onConflict: 'notification_id,user_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      // Registrar auditoria
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'NOTIFICATIONS_CLEAR_ALL',
        entity_type: 'notifications',
        entity_id: 'bulk',
        panel_type: 'client',
        details: {
          cleared_count: visibleIds.length
        }
      });

      console.log('✅ [NOTIFICATIONS] Cleared', visibleIds.length, 'notifications');
      
      // Limpar estado local imediatamente
      setNotifications([]);
      toast.success('Todas as notificações foram removidas');
      
      // Refetch para garantir consistência
      await fetchNotifications();
    } catch (err) {
      console.error('❌ [NOTIFICATIONS] Error clearing notifications:', err);
      toast.error('Erro ao limpar notificações');
    }
  };

  // Create notification helper
  const createNotification = async (notificationData: {
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error' | 'proposal' | 'delivery' | 'payment' | 'quote' | 'ticket';
    priority?: 'low' | 'normal' | 'high';
    action_url?: string;
    metadata?: Record<string, any>;
    client_id?: string;
    supplier_id?: string;
    notify_all_client_users?: boolean;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-notification', {
        body: {
          user_id: user?.id,
          ...notificationData
        }
      });

      if (error) throw error;

      console.log('✅ Notification created successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  };

  const formatTime = (created_at: string) => {
    const now = new Date();
    const notificationTime = new Date(created_at);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d atrás`;
    
    return notificationTime.toLocaleDateString('pt-BR');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications: notifications.map(n => ({
      ...n,
      time: formatTime(n.created_at),
    })),
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    createNotification,
    refetch: fetchNotifications,
  };
}