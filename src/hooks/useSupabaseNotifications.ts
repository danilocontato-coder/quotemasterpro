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

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      console.log('🔔 [NOTIFICATIONS] Raw data received:', data?.length || 0, 'notifications');

      const formattedNotifications = (data || []).map(notification => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type as 'info' | 'success' | 'warning' | 'error' | 'proposal' | 'delivery' | 'payment' | 'quote' | 'ticket',
        created_at: notification.created_at,
        read: notification.read,
        priority: notification.priority as 'low' | 'normal' | 'high',
        action_url: notification.action_url,
        metadata: notification.metadata,
      }));

      console.log('🔔 [NOTIFICATIONS] Formatted notifications:', {
        total: formattedNotifications.length,
        unread: formattedNotifications.filter(n => !n.read).length,
        types: formattedNotifications.map(n => n.type)
      });

      setNotifications(formattedNotifications);
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

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
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
                  window.location.href = newNotification.action_url;
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
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔔 [NOTIFICATIONS] Notification updated:', payload);
          fetchNotifications();
        }
      )
      .subscribe((status) => {
        console.log('🔔 [NOTIFICATIONS] Real-time subscription status:', status);
      });

    return () => {
      console.log('🔔 [NOTIFICATIONS] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;

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
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
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
    createNotification,
    refetch: fetchNotifications,
  };
}