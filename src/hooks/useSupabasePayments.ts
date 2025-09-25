import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface Payment {
  id: string;
  quote_id: string;
  client_id: string;
  supplier_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'in_escrow' | 'completed' | 'failed' | 'disputed' | 'refunded';
  stripe_payment_intent_id?: string;
  stripe_session_id?: string;
  escrow_release_date?: string;
  created_at: string;
  updated_at: string;
  quotes?: {
    id: string;
    title: string;
    client_name: string;
  };
  suppliers?: {
    id: string;
    name: string;
  };
  clients?: {
    id: string;
    name: string;
  };
}

export const useSupabasePayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          quotes(id, title, client_name),
          suppliers(id, name),
          clients(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Payments fetch error:', error);
        throw error;
      }
      
      setPayments((data as Payment[]) || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Erro ao carregar pagamentos",
        description: "Não foi possível carregar a lista de pagamentos.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createPaymentIntent = async (paymentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { paymentId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      toast({
        title: "Erro ao processar pagamento",
        description: "Não foi possível iniciar o pagamento.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const createCheckoutSession = async (paymentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-checkout', {
        body: { paymentId }
      });
      if (error) throw error;
      return data; // expects { url, session_id }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Erro ao iniciar pagamento",
        description: "Não foi possível redirecionar para o Stripe.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const confirmDelivery = async (paymentId: string, notes?: string) => {
    try {
      // Simular confirmação de entrega por enquanto
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .eq('status', 'in_escrow');

      if (error) throw error;

      toast({
        title: "Entrega confirmada",
        description: "Pagamento liberado para o fornecedor.",
      });
      
      fetchPayments(); // Refresh list
      return { success: true };
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast({
        title: "Erro ao confirmar entrega",
        description: "Não foi possível confirmar a entrega.",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Real-time subscription
  useEffect(() => {
    fetchPayments();
    
    const channel = supabase
      .channel('payments-changes')
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
  }, []);

  return {
    payments,
    isLoading,
    refetch: fetchPayments,
    createPaymentIntent,
    createCheckoutSession,
    confirmDelivery
  };
};