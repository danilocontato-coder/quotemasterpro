import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    local_code: string;
    title: string;
    total: number;
    client_name: string;
    suppliers?: {
      id: string;
      name: string;
      asaas_wallet_id?: string;
    };
  };
  suppliers?: {
    id: string;
    name: string;
    asaas_wallet_id?: string;
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
      console.log('Fetching payments...');
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          quotes(id, local_code, title, total, client_name, supplier_id, suppliers(id, name, asaas_wallet_id)),
          suppliers(id, name, asaas_wallet_id),
          clients(id, name)
        `)
        .order('created_at', { ascending: false });

      console.log('Payments query result:', { data, error });

      if (error) {
        console.error('Payments fetch error:', error);
        throw error;
      }
      
      setPayments((data as Payment[]) || []);
      console.log('Payments set to state:', data);
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
      console.log('Creating checkout session for payment:', paymentId);
      
      const { data, error } = await supabase.functions.invoke('create-payment-checkout', {
        body: { paymentId }
      });
      
      console.log('Checkout session response:', { data, error });
      
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

  const confirmManualReceipt = async (paymentId: string, notes?: string) => {
    try {
      const { data, error } = await supabase.rpc('mark_payment_as_manually_received', {
        p_payment_id: paymentId,
        p_notes: notes
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string } | null;

      if (result?.success) {
        toast({
          title: "Pagamento confirmado",
          description: "Recebimento manual confirmado com sucesso.",
        });
        fetchPayments();
        return { success: true };
      } else {
        throw new Error(result?.message || 'Erro ao confirmar pagamento');
      }
    } catch (error: any) {
      console.error('Error confirming manual receipt:', error);
      toast({
        title: "Erro ao confirmar recebimento",
        description: error.message || "Não foi possível confirmar o recebimento manual.",
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
    confirmDelivery,
    confirmManualReceipt
  };
};