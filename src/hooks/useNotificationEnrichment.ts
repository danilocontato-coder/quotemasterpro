import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EnrichedData {
  supplier_name?: string;
  quote_code?: string;
  quote_title?: string;
  confirmation_code?: string;
  code_expires_at?: string;
  payment_amount?: number;
  client_name?: string;
}

export function useNotificationEnrichment(metadata?: Record<string, any>) {
  const [enrichedData, setEnrichedData] = useState<EnrichedData>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!metadata) return;

    const fetchData = async () => {
      setIsLoading(true);
      const data: EnrichedData = {};

      try {
        // Buscar nome do fornecedor
        if (metadata.supplier_id) {
          const { data: supplier } = await supabase
            .from('suppliers')
            .select('name')
            .eq('id', metadata.supplier_id)
            .single();
          if (supplier) data.supplier_name = supplier.name;
        }

        // Buscar código e título da cotação
        if (metadata.quote_id) {
          const { data: quote } = await supabase
            .from('quotes')
            .select('local_code, title')
            .eq('id', metadata.quote_id)
            .single();
          if (quote) {
            data.quote_code = quote.local_code;
            data.quote_title = quote.title;
          }
        }

        // Buscar código de confirmação de entrega
        if (metadata.delivery_id) {
          const { data: confirmation } = await supabase
            .from('delivery_confirmations')
            .select('confirmation_code, expires_at')
            .eq('delivery_id', metadata.delivery_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (confirmation) {
            data.confirmation_code = confirmation.confirmation_code;
            data.code_expires_at = confirmation.expires_at;
          }
        }

        // Buscar informações de pagamento
        if (metadata.payment_id) {
          const { data: payment } = await supabase
            .from('payments')
            .select('amount')
            .eq('id', metadata.payment_id)
            .single();
          if (payment) data.payment_amount = payment.amount;
        }

        // Buscar nome do cliente
        if (metadata.client_id) {
          const { data: client } = await supabase
            .from('clients')
            .select('name')
            .eq('id', metadata.client_id)
            .single();
          if (client) data.client_name = client.name;
        }

        setEnrichedData(data);
      } catch (error) {
        console.error('Error enriching notification:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [metadata]);

  return { enrichedData, isLoading };
}
