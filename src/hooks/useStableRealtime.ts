import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook unificado e estável para todas as subscrições real-time
 * Evita conflitos e múltiplas conexões
 */
export function useStableRealtime() {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  
  useEffect(() => {
    // Evita múltiplas inicializações
    if (!user?.id || isInitializedRef.current) return;
    
    console.log('🔗 [STABLE-REALTIME] Inicializando canal único para:', user.id);
    
    // Criar canal único com timeout para evitar errors
    const channelName = `stable-realtime-${user.id}-${Date.now()}`;
    channelRef.current = supabase.channel(channelName);
    
    // Configurar listeners baseados no role
    if (user.clientId) {
      channelRef.current
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'quotes', filter: `client_id=eq.${user.clientId}` },
          () => window.dispatchEvent(new CustomEvent('quotes-updated'))
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'clients', filter: `id=eq.${user.clientId}` },
          () => window.dispatchEvent(new CustomEvent('client-updated'))
        );
    }
    
    if (user.supplierId) {
      channelRef.current
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'suppliers', filter: `id=eq.${user.supplierId}` },
          () => window.dispatchEvent(new CustomEvent('supplier-updated'))
        );
    }
    
    // Profile updates para todos
    channelRef.current
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => window.dispatchEvent(new CustomEvent('profile-updated'))
      );
    
    // Subscribe com retry logic
    const subscribeWithRetry = async (retries = 3) => {
      try {
        await channelRef.current.subscribe((status: string) => {
          console.log('🔗 [STABLE-REALTIME] Status:', status);
          if (status === 'SUBSCRIBED') {
            isInitializedRef.current = true;
          }
        });
      } catch (error) {
        console.error('🔗 [STABLE-REALTIME] Subscription error:', error);
        if (retries > 0) {
          setTimeout(() => subscribeWithRetry(retries - 1), 1000);
        }
      }
    };
    
    subscribeWithRetry();
    
    return () => {
      console.log('🔗 [STABLE-REALTIME] Cleanup');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [user?.id]); // Dependência mínima
  
  return null;
}