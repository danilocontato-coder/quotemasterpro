import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Global registry para prevenir múltiplas subscrições
const activeChannels = new Set<string>();

/**
 * Hook de realtime otimizado que previne loops e múltiplas subscrições
 */
export function useStableRealtime() {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  const userIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Só configurar se há usuário e não está já configurado para este usuário
    if (!user?.id || userIdRef.current === user.id) return;
    
    // Cleanup anterior se existir
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    const channelKey = `realtime-${user.id}`;
    
    // Prevenir múltiplas subscrições para o mesmo usuário
    if (activeChannels.has(channelKey)) return;
    
    activeChannels.add(channelKey);
    userIdRef.current = user.id;
    
    // Criar canal único
    const channelName = `optimized-${user.id}-${Date.now()}`;
    channelRef.current = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }, // Não receber próprias mudanças
        presence: { key: user.id }
      }
    });
    
    // Configurar listeners mínimos baseados no role
    if (user.clientId && user.role !== 'admin') {
      // Quotes para clientes
      channelRef.current.on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'quotes', 
          filter: `client_id=eq.${user.clientId}` 
        },
        (payload: any) => {
          // Throttle events para evitar spam
          window.dispatchEvent(new CustomEvent('quotes-updated', { detail: payload }));
        }
      );
    }
    
    if (user.supplierId && user.role === 'supplier') {
      // Quotes para fornecedores
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
    
    // Profile updates (mínimo necessário)
    channelRef.current.on('postgres_changes',
      { 
        event: 'UPDATE', // Só updates, não inserts/deletes
        schema: 'public', 
        table: 'profiles', 
        filter: `id=eq.${user.id}` 
      },
      (payload: any) => {
        window.dispatchEvent(new CustomEvent('profile-updated', { detail: payload }));
      }
    );
    
    // Subscribe com timeout
    const subscribeTimeout = setTimeout(() => {
      if (channelRef.current) {
        channelRef.current.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('Realtime conectado para usuário:', user.id);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Erro no canal realtime');
            // Retry em caso de erro
            setTimeout(() => {
              if (channelRef.current) {
                channelRef.current.unsubscribe();
                channelRef.current.subscribe();
              }
            }, 5000);
          }
        });
      }
    }, 500); // Delay para evitar problemas de inicialização
    
    return () => {
      clearTimeout(subscribeTimeout);
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      activeChannels.delete(channelKey);
      userIdRef.current = null;
    };
  }, [user?.id]); // Só depende do ID do usuário
  
  return null;
}