// Hook for backwards compatibility - now uses real Supabase notifications
import { useSupabaseNotifications } from './useSupabaseNotifications';

export function useNotifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSupabaseNotifications();
  
  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
}