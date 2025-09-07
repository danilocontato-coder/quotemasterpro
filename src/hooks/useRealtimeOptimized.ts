import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook otimizado para realtime que evita reloads automáticos
 */
export function useRealtimeOptimized() {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  const isVisibleRef = useRef(!document.hidden);
  
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('🔍 [REALTIME-OPT] Iniciando realtime otimizado para:', user.id);
    
    // Monitor de visibilidade
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      console.log('🔍 [REALTIME-OPT] Visibilidade:', isVisibleRef.current ? 'visível' : 'oculto');
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    
    // Configurar channel único e estável
    if (!channelRef.current) {
      channelRef.current = supabase
        .channel(`realtime-optimized-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            if (isVisibleRef.current) {
              console.log('🔍 [REALTIME-OPT] Notificação atualizada');
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          () => {
            if (isVisibleRef.current) {
              console.log('🔍 [REALTIME-OPT] Profile atualizado');
              window.dispatchEvent(new CustomEvent('user-profile-updated'));
            }
          }
        );
      
      if (user.clientId) {
        channelRef.current.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'clients',
            filter: `id=eq.${user.clientId}`,
          },
          () => {
            if (isVisibleRef.current) {
              console.log('🔍 [REALTIME-OPT] Cliente atualizado');
              window.dispatchEvent(new CustomEvent('client-data-updated'));
            }
          }
        );
      }
      
      channelRef.current.subscribe();
      console.log('🔍 [REALTIME-OPT] Canal subscrito');
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channelRef.current) {
        console.log('🔍 [REALTIME-OPT] Limpando canal');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]); // Dependência mínima e estável
  
  return null;
}