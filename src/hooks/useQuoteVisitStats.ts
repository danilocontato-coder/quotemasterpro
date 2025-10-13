import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VisitStats {
  total: number;
  scheduled: number;
  confirmed: number;
  pending: number;
}

export function useQuoteVisitStats(quoteId?: string) {
  const [stats, setStats] = useState<VisitStats>({
    total: 0,
    scheduled: 0,
    confirmed: 0,
    pending: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!quoteId) return;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Buscar quote para saber quantos fornecedores foram enviados
        const { data: quote } = await supabase
          .from('quotes')
          .select('suppliers_sent_count')
          .eq('id', quoteId)
          .single();

        const total = quote?.suppliers_sent_count || 0;

        // Buscar visitas para esta quote
        const { data: visits } = await supabase
          .from('quote_visits')
          .select('status')
          .eq('quote_id', quoteId);

        const scheduled = visits?.filter(v => v.status === 'scheduled').length || 0;
        const confirmed = visits?.filter(v => v.status === 'confirmed').length || 0;
        const pending = total - (visits?.length || 0);

        setStats({ total, scheduled, confirmed, pending });
      } catch (error) {
        console.error('Error fetching visit stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [quoteId]);

  return { stats, isLoading };
}
