import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useStableRealtime() {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  
  useEffect(() => {
    if (!user?.id) return;
    
    // Cleanup anterior se existir
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    // Criar canal único e simples
    const channelName = `user-${user.id}`;
    channelRef.current = supabase.channel(channelName);
    
    // Configurar listeners mínimos baseados no role
    if (user.clientId && user.role !== 'admin') {
      channelRef.current.on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'quotes', 
          filter: `client_id=eq.${user.clientId}` 
        },
        (payload: any) => {
          window.dispatchEvent(new CustomEvent('quotes-updated', { detail: payload }));
        }
      );
    }
    
    if (user.supplierId && user.role === 'supplier') {
      channelRef.current.on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'quotes',
          filter: `supplier_id=eq.${user.supplierId}`
        },
        (payload: any) => {
          window.dispatchEvent(new CustomEvent('supplier-quotes-updated', { detail: payload }));
        }
      );
    }
    
    // Subscribe
    channelRef.current.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log('Realtime conectado para usuário:', user.id);
      }
    });
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, user?.clientId, user?.supplierId, user?.role]);
  
  return null;
}