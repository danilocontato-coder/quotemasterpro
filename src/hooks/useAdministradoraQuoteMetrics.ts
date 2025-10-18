import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdministradoraAICredits } from './useAdministradoraAICredits';

interface QuoteMetrics {
  activeQuotes: number;
  draftQuotes: number;
  sentQuotes: number;
  approvedQuotes: number;
  responseRate: number;
  responsesReceived: number;
  invitationsSent: number;
  aiSavings: number;
  negotiationsSuccessful: number;
  aiCredits: number;
}

export const useAdministradoraQuoteMetrics = (currentClientId?: string) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<QuoteMetrics>({
    activeQuotes: 0,
    draftQuotes: 0,
    sentQuotes: 0,
    approvedQuotes: 0,
    responseRate: 0,
    responsesReceived: 0,
    invitationsSent: 0,
    aiSavings: 0,
    negotiationsSuccessful: 0,
    aiCredits: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const { credits } = useAdministradoraAICredits(currentClientId);

  const fetchMetrics = async () => {
    if (!user?.clientId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Build filter for quotes (administradora + condominiums)
      let query = supabase.from('quotes').select('*', { count: 'exact' });

      if (currentClientId) {
        // Filter by specific client
        query = query.or(`client_id.eq.${currentClientId},on_behalf_of_client_id.eq.${currentClientId}`);
      } else {
        // All quotes from administradora
        query = query.eq('client_id', user.clientId);
      }

      const { data: quotes, error } = await query;

      if (error) throw error;

      const activeQuotes = quotes?.filter((q) =>
        ['sent', 'receiving', 'under_review'].includes(q.status)
      ).length || 0;

      const draftQuotes = quotes?.filter((q) => q.status === 'draft').length || 0;
      const sentQuotes = quotes?.filter((q) => q.status === 'sent').length || 0;
      const approvedQuotes = quotes?.filter((q) => q.status === 'approved').length || 0;

      // Calculate response rate
      const invitationsSent = quotes?.reduce((sum, q) => sum + (q.suppliers_sent_count || 0), 0) || 0;
      const responsesReceived = quotes?.reduce((sum, q) => sum + (q.responses_count || 0), 0) || 0;
      const responseRate = invitationsSent > 0 ? Math.round((responsesReceived / invitationsSent) * 100) : 0;

      // AI metrics (simplified - would need real data from negotiations table)
      const negotiationsSuccessful = 0; // TODO: Query ai_negotiations table
      const aiSavings = 0; // TODO: Calculate from successful negotiations

      setMetrics({
        activeQuotes,
        draftQuotes,
        sentQuotes,
        approvedQuotes,
        responseRate,
        responsesReceived,
        invitationsSent,
        aiSavings,
        negotiationsSuccessful,
        aiCredits: credits?.available_credits || 0,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [user?.clientId, currentClientId, credits]);

  return {
    metrics,
    isLoading,
    refetch: fetchMetrics,
  };
};
