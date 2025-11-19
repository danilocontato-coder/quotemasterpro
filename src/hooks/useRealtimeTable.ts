import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeTableOptions {
  table: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  filter?: string;
  onData: (payload: any) => void;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Hook genérico para subscrições Realtime do Supabase
 * Substitui polling por eventos push do banco
 * 
 * @example
 * useRealtimeTable({
 *   table: 'notifications',
 *   filter: `user_id=eq.${userId}`,
 *   onData: (payload) => refetch()
 * });
 */
export function useRealtimeTable({
  table,
  event = '*',
  filter,
  onData,
  enabled = true,
  debounceMs = 0
}: UseRealtimeTableOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime-${table}-${Date.now()}`;
    channelRef.current = supabase.channel(channelName);

    const handleChange = (payload: any) => {
      if (debounceMs > 0) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => onData(payload), debounceMs);
      } else {
        onData(payload);
      }
    };

    channelRef.current
      .on(
        'postgres_changes' as any,
        { event, schema: 'public', table, filter } as any,
        handleChange
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ [Realtime] Subscribed to ${table}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ [Realtime] Error subscribing to ${table}`);
        }
      });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        console.log(`🔌 [Realtime] Unsubscribed from ${table}`);
      }
    };
  }, [table, event, filter, enabled, debounceMs]);

  return null;
}
