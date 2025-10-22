/**
 * Quote Tokens Monitoring Hook
 * 
 * Provides real-time metrics and monitoring data for the quote token system.
 * Used by SuperAdmin dashboard to track token usage, expiration, and health.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TokenMetrics {
  total_tokens: number;
  active_tokens: number;
  expired_unused: number;
  used_tokens: number;
  usage_rate: number;
  created_today: number;
  expiring_soon: number;
}

export interface TokenActivity {
  quote_id: string;
  quote_title: string;
  supplier_name: string | null;
  created_at: string;
  expires_at: string;
  access_count: number;
  used_at: string | null;
  short_code: string;
}

export function useQuoteTokensMonitoring() {
  const [metrics, setMetrics] = useState<TokenMetrics>({
    total_tokens: 0,
    active_tokens: 0,
    expired_unused: 0,
    used_tokens: 0,
    usage_rate: 0,
    created_today: 0,
    expiring_soon: 0,
  });
  const [recentActivity, setRecentActivity] = useState<TokenActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokenMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const now = new Date().toISOString();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Fetch all tokens
      const { data: tokens, error: tokensError } = await supabase
        .from('quote_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (tokensError) throw tokensError;

      const allTokens = tokens || [];

      // Calculate metrics
      const total_tokens = allTokens.length;
      const active_tokens = allTokens.filter(t => 
        new Date(t.expires_at) > new Date() && !t.used_at
      ).length;
      const expired_unused = allTokens.filter(t => 
        new Date(t.expires_at) < new Date() && !t.used_at
      ).length;
      const used_tokens = allTokens.filter(t => t.used_at !== null).length;
      const usage_rate = total_tokens > 0 ? (used_tokens / total_tokens) * 100 : 0;
      const created_today = allTokens.filter(t => 
        new Date(t.created_at) >= new Date(todayISO)
      ).length;
      const expiring_soon = allTokens.filter(t => 
        new Date(t.expires_at) > new Date() && 
        new Date(t.expires_at) < new Date(in24Hours) &&
        !t.used_at
      ).length;

      setMetrics({
        total_tokens,
        active_tokens,
        expired_unused,
        used_tokens,
        usage_rate,
        created_today,
        expiring_soon,
      });

      // Fetch recent activity with quote and supplier details
      const { data: activityData, error: activityError } = await supabase
        .from('quote_tokens')
        .select(`
          quote_id,
          created_at,
          expires_at,
          access_count,
          used_at,
          short_code,
          supplier_id,
          quotes!inner(title),
          suppliers(name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (activityError) throw activityError;

      const formattedActivity: TokenActivity[] = (activityData || []).map((item: any) => ({
        quote_id: item.quote_id,
        quote_title: item.quotes?.title || 'Sem título',
        supplier_name: item.suppliers?.name || null,
        created_at: item.created_at,
        expires_at: item.expires_at,
        access_count: item.access_count || 0,
        used_at: item.used_at,
        short_code: item.short_code,
      }));

      setRecentActivity(formattedActivity);

      console.log('✅ Token metrics loaded:', metrics);
    } catch (err) {
      console.error('❌ Error fetching token metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load token metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenMetrics();

    // Real-time subscription
    const channel = supabase
      .channel('token-monitoring')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'quote_tokens' }, 
        () => {
          console.log('🔄 Token change detected, refreshing metrics...');
          fetchTokenMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    metrics,
    recentActivity,
    isLoading,
    error,
    refetch: fetchTokenMetrics,
  };
}
