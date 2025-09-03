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
    if (!user) return;

    // Canal principal para atualizações de dados do usuário
    const channel = supabase
      .channel('user-data-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Notificações são atualizadas automaticamente pelo hook useSupabaseNotifications
          console.log('Notification update detected');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          // Profile updates podem afetar os dados do cliente
          console.log('Profile update detected');
          // Dispara evento customizado em vez de reload forçado para evitar interferir com navegação
          window.dispatchEvent(new CustomEvent('user-profile-updated'));
        }
      );

    // Se o usuário tem client_id, monitora mudanças nos dados do cliente
    if (user.clientId) {
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'clients',
            filter: `id=eq.${user.clientId}`,
          },
          () => {
            console.log('Client data update detected');
            // Força recarregamento dos dados do cliente
            window.dispatchEvent(new CustomEvent('client-data-updated'));
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'quotes',
            filter: `client_id=eq.${user.clientId}`,
          },
          () => {
            console.log('Quote update detected for client');
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products',
            filter: `client_id=eq.${user.clientId}`,
          },
          () => {
            console.log('Product update detected for client');
          }
        );
    }

    // Se o usuário tem supplier_id, monitora mudanças nos dados do fornecedor
    if (user.supplierId) {
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'suppliers',
            filter: `id=eq.${user.supplierId}`,
          },
          () => {
            console.log('Supplier data update detected');
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products',
            filter: `supplier_id=eq.${user.supplierId}`,
          },
          () => {
            console.log('Product update detected for supplier');
          }
        );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null; // Hook apenas para efeitos colaterais
}