import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useQuoteViews(quoteIds: string[]) {
  const { user } = useAuth();
  const [viewedQuotes, setViewedQuotes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Buscar cotações já visualizadas
  useEffect(() => {
    const fetchViewedQuotes = async () => {
      if (!user?.supplierId || quoteIds.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('quote_supplier_views')
          .select('quote_id')
          .eq('supplier_id', user.supplierId)
          .in('quote_id', quoteIds);

        if (error) throw error;

        const viewedSet = new Set(data?.map(v => v.quote_id) || []);
        setViewedQuotes(viewedSet);
        console.log('📊 Viewed quotes loaded:', viewedSet.size, '/', quoteIds.length);
      } catch (error) {
        console.error('Error fetching viewed quotes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchViewedQuotes();
  }, [user?.supplierId, quoteIds.join(',')]);

  // Marcar cotação como visualizada
  const markAsViewed = useCallback(async (quoteId: string) => {
    if (!user?.supplierId) return;

    try {
      // Usar upsert para incrementar view_count se já existe
      const { error } = await supabase
        .from('quote_supplier_views')
        .upsert({
          quote_id: quoteId,
          supplier_id: user.supplierId,
          last_viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'quote_id,supplier_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      setViewedQuotes(prev => new Set([...prev, quoteId]));
      console.log('✅ Quote marked as viewed:', quoteId);
    } catch (error) {
      console.error('Error marking quote as viewed:', error);
    }
  }, [user?.supplierId]);

  const isViewed = useCallback((quoteId: string) => {
    return viewedQuotes.has(quoteId);
  }, [viewedQuotes]);

  const getNewQuotesCount = useCallback(() => {
    return quoteIds.length - viewedQuotes.size;
  }, [quoteIds.length, viewedQuotes.size]);

  return {
    viewedQuotes,
    isViewed,
    markAsViewed,
    getNewQuotesCount,
    isLoading
  };
}
