import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PendingDelivery {
  quote_id: string;
  quote_local_code: string;
  quote_title: string;
  client_name: string;
  payment_id: string;
  payment_amount: number;
  payment_status: string;
  payment_date: string;
  client_address?: string;
  client_city?: string;
  client_state?: string;
}

export function usePendingDeliveries() {
  const [pendingDeliveries, setPendingDeliveries] = useState<PendingDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchPendingDeliveries = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Buscar profile do fornecedor
      const { data: profile } = await supabase
        .from('profiles')
        .select('supplier_id')
        .eq('id', user.id)
        .single();

      if (!profile?.supplier_id) {
        setPendingDeliveries([]);
        return;
      }

      // Buscar cotações com pagamento em custódia sem entrega agendada
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          status,
          created_at,
          quote_id,
          quotes!inner (
            id,
            local_code,
            title,
            client_name,
            status,
            client_id,
            clients!inner (
              id,
              name,
              address,
              city,
              state
            )
          )
        `)
        .eq('supplier_id', profile.supplier_id)
        .eq('status', 'in_escrow');

      if (error) throw error;

      // Filtrar apenas cotações sem entrega
      const quotesWithPayment = data || [];
      const pendingList: PendingDelivery[] = [];

      for (const payment of quotesWithPayment) {
        const quote = payment.quotes;
        if (!quote) continue;

        // Verificar se já existe entrega para essa cotação
        const { data: existingDelivery } = await supabase
          .from('deliveries')
          .select('id')
          .eq('quote_id', quote.id)
          .eq('supplier_id', profile.supplier_id)
          .maybeSingle();

        if (!existingDelivery) {
          pendingList.push({
            quote_id: quote.id,
            quote_local_code: quote.local_code || '',
            quote_title: quote.title,
            client_name: quote.client_name,
            payment_id: payment.id,
            payment_amount: payment.amount,
            payment_status: payment.status,
            payment_date: payment.created_at,
            client_address: (quote as any).clients?.address,
            client_city: (quote as any).clients?.city,
            client_state: (quote as any).clients?.state,
          });
        }
      }

      setPendingDeliveries(pendingList);
    } catch (error) {
      console.error('Erro ao buscar entregas pendentes:', error);
      setPendingDeliveries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingDeliveries();

    // Escutar eventos do sistema centralizado de realtime
    const handlePaymentUpdate = () => {
      console.log('🔄 [PENDING-DELIVERIES] Payment updated, refetching...');
      fetchPendingDeliveries();
    };
    
    const handleDeliveryUpdate = () => {
      console.log('🔄 [PENDING-DELIVERIES] Delivery updated, refetching...');
      fetchPendingDeliveries();
    };

    window.addEventListener('supplier-payments-updated', handlePaymentUpdate);
    window.addEventListener('supplier-deliveries-updated', handleDeliveryUpdate);

    // Auto-refetch quando a aba volta a ficar ativa
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ [PENDING-DELIVERIES] Tab became visible, refetching...');
        fetchPendingDeliveries();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('supplier-payments-updated', handlePaymentUpdate);
      window.removeEventListener('supplier-deliveries-updated', handleDeliveryUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  return {
    pendingDeliveries,
    isLoading,
    refetch: fetchPendingDeliveries,
  };
}
