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
}

export function useAdministradoraPayments() {
  const { currentClientId, adminClientId, condominios } = useAdministradora();
  const [payments, setPayments] = useState<AdministradoraPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPayments = async () => {
    if (!adminClientId) return;
    
    setIsLoading(true);
    try {
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
          suppliers (
            name
          ),
          clients (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (currentClientId === 'all') {
        // Buscar todos os pagamentos da administradora e condomínios vinculados
        const condominioIds = condominios.map(c => c.id);
        const allClientIds = [adminClientId, ...condominioIds];
        
        query = query.in('client_id', allClientIds);
      } else if (currentClientId) {
        // Filtrar por condomínio específico
        query = query.eq('client_id', currentClientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar pagamentos:', error);
      toast.error('Erro ao carregar pagamentos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();

    // Subscrever a mudanças em tempo real
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
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
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
    refetch: fetchPayments,
    createCheckoutSession,
    confirmDelivery
  };
}
