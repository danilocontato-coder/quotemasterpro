import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface QuoteUpdate {
  quoteId: string;
  newProposalsCount: number;
  unreadMessagesCount: number;
  hasNewAIAnalysis: boolean;
  isUrgent: boolean;
  lastViewed: string | null;
  lastResponsesCount: number;
}

interface QuoteViewState {
  [quoteId: string]: {
    lastViewedAt: string;
    lastResponsesCount: number;
  };
}

const STORAGE_KEY = 'quote_client_views';

export function useQuoteUpdates(quotes: any[]) {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<Map<string, QuoteUpdate>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Carregar estado do localStorage e sincronizar com Supabase
  useEffect(() => {
    const loadViewStates = async () => {
      if (!user?.clientId || quotes.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        // Carregar do Supabase
        const { data, error } = await supabase
          .from('quote_client_views')
          .select('*')
          .eq('client_id', user.clientId)
          .in('quote_id', quotes.map(q => q.id));

        if (error) {
          console.error('Error loading quote views:', error);
          return;
        }

        // Criar mapa de atualizações
        const updatesMap = new Map<string, QuoteUpdate>();

        quotes.forEach(quote => {
          const view = data?.find(v => v.quote_id === quote.id);
          const currentResponsesCount = quote.responses_count || 0;
          const lastViewedResponsesCount = view?.last_responses_count || 0;
          
          // Calcular novas propostas
          const newProposalsCount = Math.max(0, currentResponsesCount - lastViewedResponsesCount);
          
          // Verificar deadline urgente (< 48h)
          const isUrgent = quote.deadline ? 
            new Date(quote.deadline).getTime() - new Date().getTime() < 48 * 60 * 60 * 1000 : 
            false;

          // TODO: Implementar detecção de mensagens não lidas e análises AI
          const unreadMessagesCount = 0;
          const hasNewAIAnalysis = false;

          updatesMap.set(quote.id, {
            quoteId: quote.id,
            newProposalsCount,
            unreadMessagesCount,
            hasNewAIAnalysis,
            isUrgent,
            lastViewed: view?.last_viewed_at || null,
            lastResponsesCount: lastViewedResponsesCount
          });
        });

        setUpdates(updatesMap);
        console.log('📊 Quote updates loaded:', updatesMap.size);
      } catch (error) {
        console.error('Error in loadViewStates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadViewStates();
  }, [user?.clientId, quotes.length, quotes.map(q => `${q.id}-${q.responses_count}`).join(',')]);

  // Marcar cotação como visualizada
  const markAsViewed = useCallback(async (quoteId: string) => {
    if (!user?.clientId) return;

    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;

    try {
      // Atualizar no Supabase
      const { error } = await supabase
        .from('quote_client_views')
        .upsert({
          quote_id: quoteId,
          client_id: user.clientId,
          last_viewed_at: new Date().toISOString(),
          last_responses_count: quote.responses_count || 0
        }, {
          onConflict: 'quote_id,client_id'
        });

      if (error) {
        console.error('Error marking quote as viewed:', error);
        return;
      }

      // Atualizar estado local
      setUpdates(prev => {
        const newMap = new Map(prev);
        const update = newMap.get(quoteId);
        if (update) {
          newMap.set(quoteId, {
            ...update,
            newProposalsCount: 0,
            lastViewed: new Date().toISOString(),
            lastResponsesCount: quote.responses_count || 0
          });
        }
        return newMap;
      });

      console.log('✅ Quote marked as viewed:', quoteId);
    } catch (error) {
      console.error('Error marking quote as viewed:', error);
    }
  }, [user?.clientId, quotes]);

  // Verificar se cotação tem atualizações
  const hasUpdates = useCallback((quoteId: string) => {
    const update = updates.get(quoteId);
    if (!update) return false;
    
    return update.newProposalsCount > 0 || 
           update.unreadMessagesCount > 0 || 
           update.hasNewAIAnalysis || 
           update.isUrgent;
  }, [updates]);

  // Obter atualizações de uma cotação
  const getQuoteUpdates = useCallback((quoteId: string): QuoteUpdate | null => {
    return updates.get(quoteId) || null;
  }, [updates]);

  // Obter total de cotações com atualizações
  const getTotalUpdatesCount = useCallback(() => {
    return Array.from(updates.values()).filter(update => 
      update.newProposalsCount > 0 || 
      update.unreadMessagesCount > 0 || 
      update.hasNewAIAnalysis
    ).length;
  }, [updates]);

  // Obter cotações com atualizações
  const getQuotesWithUpdates = useCallback(() => {
    return quotes.filter(quote => hasUpdates(quote.id));
  }, [quotes, hasUpdates]);

  return {
    updates,
    isLoading,
    hasUpdates,
    getQuoteUpdates,
    getTotalUpdatesCount,
    getQuotesWithUpdates,
    markAsViewed
  };
}
