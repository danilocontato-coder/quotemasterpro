import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdministradora } from '@/contexts/AdministradoraContext';
import { toast } from 'sonner';

export interface AdministradoraPayment {
  id: string;
  quote_id: string;
  client_id: string;
  supplier_id: string | null;
  amount: number;
  status: string;
  payment_method: string | null;
  escrow_release_date: string | null;
  created_at: string;
  updated_at: string;
  quotes: {
    local_code: string;
    title: string;
    client_name: string;
    supplier_name: string | null;
    client_id: string;
    on_behalf_of_client_id: string | null;
  } | null;
  suppliers: {
    name: string;
  } | null;
  clients: {
    name: string;
  } | null;
  quote_responses?: Array<{
    id: string;
    items: Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
      total: number;
      brand?: string;
      specifications?: string;
    }>;
    shipping_cost: number;
    delivery_time: number;
    warranty_months: number;
    total_amount: number;
  }>;
}

export function useAdministradoraPayments() {
  const { currentClientId, adminClientId, condominios } = useAdministradora();
  const [payments, setPayments] = useState<AdministradoraPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);

  const fetchPayments = async (isInitialLoad = false) => {
    if (!adminClientId) return;
    
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsRefetching(true);
    }
    
    try {
      // Construir query base com LEFT JOIN
      let query = supabase
        .from('payments')
        .select(`
          *,
          quotes (
            local_code,
            title,
            client_name,
            supplier_name,
            client_id,
            on_behalf_of_client_id
          ),
          suppliers (name),
          clients (name),
          quote_responses!left (
            id,
            items,
            shipping_cost,
            delivery_time,
            warranty_months,
            total_amount,
            status
          )
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtros por cliente
      if (currentClientId === 'all') {
        const condominioIds = condominios.map(c => c.id);
        const allClientIds = [adminClientId, ...condominioIds];
        query = query.in('client_id', allClientIds);
      } else if (currentClientId) {
        query = query.eq('client_id', currentClientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filtrar apenas responses aprovadas no JavaScript
      const paymentsWithApprovedResponses = (data || []).map(payment => ({
        ...payment,
        quote_responses: Array.isArray(payment.quote_responses)
          ? payment.quote_responses.filter((r: any) => r.status === 'approved')
          : []
      }));

      setPayments(paymentsWithApprovedResponses as AdministradoraPayment[]);
    } catch (error: any) {
      console.error('Erro ao buscar pagamentos:', error);
      toast.error('Erro ao carregar pagamentos');
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  };

  useEffect(() => {
    fetchPayments(true); // Initial load

    let timeoutId: NodeJS.Timeout;

    // ✅ Subscrever a mudanças em tempo real com debounce
    const channel = supabase
      .channel('administradora-payments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          // Limpar timeout anterior
          clearTimeout(timeoutId);
          
          // Aguardar 2 segundos antes de refetch para agrupar múltiplas mudanças
          timeoutId = setTimeout(() => {
            console.log('🔄 [Administradora] Refetch após mudanças agrupadas');
            fetchPayments(false);
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [currentClientId, adminClientId, condominios.length]);

  const createCheckoutSession = async (paymentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { paymentId }
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Erro ao criar sessão de checkout:', error);
      toast.error('Erro ao processar pagamento');
      throw error;
    }
  };

  const confirmDelivery = async (paymentId: string) => {
    try {
      const { error } = await supabase.functions.invoke('release-escrow-payment', {
        body: {
          paymentId,
          deliveryConfirmed: true,
          notes: 'Entrega confirmada pela administradora'
        }
      });

      if (error) throw error;
      
      toast.success('Pagamento liberado com sucesso!');
      await fetchPayments();
    } catch (error: any) {
      console.error('Erro ao confirmar entrega:', error);
      toast.error('Erro ao liberar pagamento');
      throw error;
    }
  };

  return {
    payments,
    isLoading,
    isRefetching,
    refetch: () => fetchPayments(false),
    createCheckoutSession,
    confirmDelivery
  };
}
