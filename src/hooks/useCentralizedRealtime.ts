import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook ÚNICO e centralizado para ALL real-time subscriptions
 * Substitui useStableRealtime e todos os outros hooks individuais
 * para evitar conflitos e múltiplas conexões
 */
export function useCentralizedRealtime() {
  const { user } = useAuth();
  const masterChannelRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  
  useEffect(() => {
    // Só executar se tiver usuário e não estiver já ativo
    if (!user?.id || isActiveRef.current) return;
    
    console.log('🔌 [CENTRAL-REALTIME] Inicializando subscrição centralizada para:', user.id);
    isActiveRef.current = true;
    
    // Criar um único canal master
    const channelName = `central-realtime-${user.id}`;
    masterChannelRef.current = supabase.channel(channelName);
    
    // Adicionar listeners baseados no role do usuário
    if (user.clientId) {
      // Para clientes: quotes, notifications, payments
      masterChannelRef.current
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'quotes', filter: `client_id=eq.${user.clientId}` },
          () => {
            console.log('📊 [CENTRAL-REALTIME] Quote updated');
            window.dispatchEvent(new CustomEvent('quotes-updated'));
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => {
            console.log('🔔 [CENTRAL-REALTIME] Notification updated');
            window.dispatchEvent(new CustomEvent('notifications-updated'));
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'clients', filter: `id=eq.${user.clientId}` },
          () => {
            console.log('🏢 [CENTRAL-REALTIME] Client updated');
            window.dispatchEvent(new CustomEvent('client-updated'));
          }
        );
    }
    
    if (user.supplierId) {
      // Para fornecedores: supplier_quotes, products, notifications, payments, deliveries
      masterChannelRef.current
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'quotes' },
          () => {
            console.log('📊 [CENTRAL-REALTIME] Quote updated (supplier view)');
            window.dispatchEvent(new CustomEvent('supplier-quotes-updated'));
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'suppliers', filter: `id=eq.${user.supplierId}` },
          () => {
            console.log('🏭 [CENTRAL-REALTIME] Supplier updated');
            window.dispatchEvent(new CustomEvent('supplier-updated'));
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => {
            console.log('🔔 [CENTRAL-REALTIME] Notification updated (supplier)');
            window.dispatchEvent(new CustomEvent('notifications-updated'));
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `supplier_id=eq.${user.supplierId}` },
          () => {
            console.log('🔔 [CENTRAL-REALTIME] Notification updated (supplier broadcast)');
            window.dispatchEvent(new CustomEvent('notifications-updated'));
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'payments' },
          () => {
            console.log('💰 [CENTRAL-REALTIME] Payment updated (supplier)');
            window.dispatchEvent(new CustomEvent('supplier-payments-updated'));
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'deliveries' },
          () => {
            console.log('🚚 [CENTRAL-REALTIME] Delivery updated (supplier)');
            window.dispatchEvent(new CustomEvent('supplier-deliveries-updated'));
          }
        );
    }
    
    // Profile updates para todos
    masterChannelRef.current
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => {
          console.log('👤 [CENTRAL-REALTIME] Profile updated');
          window.dispatchEvent(new CustomEvent('profile-updated'));
        }
      );
    
    // Subscribe with error handling
    masterChannelRef.current
      .subscribe((status: string) => {
        console.log('🔌 [CENTRAL-REALTIME] Status:', status);
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.warn('🔌 [CENTRAL-REALTIME] Connection issue, will retry...');
          // Auto-retry logic could be added here
        }
      });
    
    return () => {
      console.log('🔌 [CENTRAL-REALTIME] Limpando subscrição centralizada');
      if (masterChannelRef.current) {
        supabase.removeChannel(masterChannelRef.current);
        masterChannelRef.current = null;
      }
      isActiveRef.current = false;
    };
  }, [user?.id, user?.clientId, user?.supplierId]); // Dependências mínimas
  
  return null;
}