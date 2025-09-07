import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para sincronização em tempo real dos dados do usuário
 * Garante que mudanças no banco sejam refletidas imediatamente na UI
 */
export function useRealtimeDataSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Debounce para evitar múltiplas atualizações
    let updateTimeout: NodeJS.Timeout;
    const debounceUpdate = (callback: () => void) => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(callback, 300);
    };

    // Canal otimizado para atualizações seletivas
    const channel = supabase
      .channel(`user-data-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          debounceUpdate(() => {
            console.debug('Notification update detected');
          });
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
          // Só atualizar se página estiver visível
          if (!document.hidden) {
            debounceUpdate(() => {
              console.debug('Profile update detected - página visível');
              window.dispatchEvent(new CustomEvent('user-profile-updated'));
            });
          }
        }
      );

    // Monitora mudanças críticas apenas (otimizado)
    if (user.clientId) {
      channel
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'clients',
            filter: `id=eq.${user.clientId}`,
          },
          () => {
            // Só atualizar se página estiver visível
            if (!document.hidden) {
              debounceUpdate(() => {
                console.debug('Client data update detected - página visível');
                window.dispatchEvent(new CustomEvent('client-data-updated'));
              });
            }
          }
        );
    }

    // Monitora fornecedores (otimizado)
    if (user.supplierId) {
      channel
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'suppliers',
            filter: `id=eq.${user.supplierId}`,
          },
          () => {
            debounceUpdate(() => {
              console.debug('Supplier data update detected');
            });
          }
        );
    }

    channel.subscribe();

    return () => {
      clearTimeout(updateTimeout);
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.clientId, user?.supplierId]);

  return null; // Hook apenas para efeitos colaterais
}