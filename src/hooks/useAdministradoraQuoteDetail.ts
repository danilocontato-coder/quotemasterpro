import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdministradoraQuoteDetail } from '@/types/administradoraQuotes';

export const useAdministradoraQuoteDetail = (quoteId?: string) => {
  const [quote, setQuote] = useState<AdministradoraQuoteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuoteDetail = async () => {
    if (!quoteId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch quote with items
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId);

      if (itemsError) throw itemsError;

      // Fetch proposals
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('quote_responses')
        .select(`
          *,
          suppliers (
            name,
            rating,
            is_certified
          )
        `)
        .eq('quote_id', quoteId);

      if (proposalsError) throw proposalsError;

      // Fetch AI analyses
      const { data: analysesData } = await supabase
        .from('ai_proposal_analyses')
        .select('*')
        .in(
          'proposal_id',
          proposalsData?.map((p) => p.id) || []
        );

      // Fetch visits
      const { data: visitsData } = await supabase
        .from('quote_visits')
        .select('*')
        .eq('quote_id', quoteId);

      const detail: AdministradoraQuoteDetail = {
        ...quoteData,
        items: itemsData || [],
        proposals:
          proposalsData?.map((p) => ({
            id: p.id,
            supplier_id: p.supplier_id,
            supplier_name: p.suppliers?.name || 'Unknown',
            supplier_rating: p.suppliers?.rating,
            supplier_certified: p.suppliers?.is_certified,
            total_amount: p.total_amount || 0,
            delivery_time: p.delivery_time || 0,
            shipping_cost: p.shipping_cost,
            warranty_months: p.warranty_months,
            notes: p.notes,
            status: p.status || 'pending',
            created_at: p.created_at,
          })) || [],
        analyses: analysesData || [],
        visits: visitsData || [],
      };

      setQuote(detail);
    } catch (err: any) {
      console.error('Error fetching quote detail:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuoteDetail();
  }, [quoteId]);

  return {
    quote,
    isLoading,
    error,
    refetch: fetchQuoteDetail,
  };
};
