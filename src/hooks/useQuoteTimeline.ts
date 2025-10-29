import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TimelineEvent {
  event_id: string;
  event_type: string;
  event_date: string;
  event_title: string;
  event_description: string;
  event_metadata: any;
  user_name: string | null;
  user_role: string | null;
}

export function useQuoteTimeline(quoteId: string | null) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!quoteId) {
      setEvents([]);
      return;
    }

    const fetchTimeline = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.rpc('get_quote_timeline', {
          p_quote_id: quoteId
        });

        if (error) throw error;

        setEvents(data || []);
      } catch (err: any) {
        console.error('Error fetching quote timeline:', err);
        setError(err);
        toast({
          title: 'Erro ao carregar timeline',
          description: 'Não foi possível carregar a linha do tempo da cotação.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [quoteId, toast]);

  return { events, loading, error };
}
