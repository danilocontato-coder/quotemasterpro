import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Payment {
  id: string;
  quote_id: string;
  client_id: string;
  supplier_id: string | null;
  amount: number;
  status: 'pending' | 'processing' | 'in_escrow' | 'completed' | 'failed' | 'disputed' | 'refunded' | 'waiting_confirmation';
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  pix_qr_code: string | null;
  pix_code: string | null;
  boleto_url: string | null;
  paid_at: string | null;
  escrow_release_date: string | null;
  asaas_invoice_url: string | null;
  asaas_due_date: string | null;
  created_at: string;
  updated_at: string;
  quotes: {
    id: string;
    local_code: string;
    title: string;
    total: number;
    client_name: string;
    supplier_id: string | null;
    suppliers: {
      id: string;
      name: string;
      asaas_wallet_id: string | null;
    } | null;
  } | null;
  suppliers: {
    id: string;
    name: string;
    asaas_wallet_id: string | null;
  } | null;
  clients: {
    id: string;
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

export const useSupabasePayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching payments...');
      
      // Primeiro busca os pagamentos
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          quotes(id, local_code, title, total, client_name, supplier_id, suppliers(id, name, asaas_wallet_id)),
          suppliers(id, name, asaas_wallet_id),
          clients(id, name)
        `)
        .order('created_at', { ascending: false });

      if (paymentsError) {
        console.error('Payments fetch error:', paymentsError);
        throw paymentsError;
      }

      // Para cada pagamento, buscar a resposta aprovada do fornecedor
      const paymentsWithResponses = await Promise.all(
        (paymentsData || []).map(async (payment) => {
          if (!payment.quote_id || !payment.supplier_id) {
            return payment as unknown as Payment;
          }

          const { data: responseData } = await supabase
            .from('quote_responses')
            .select('id, items, shipping_cost, delivery_time, warranty_months, total_amount')
            .eq('quote_id', payment.quote_id)
            .eq('supplier_id', payment.supplier_id)
            .eq('status', 'approved')
            .maybeSingle();

          return {
            ...payment,
            quote_responses: responseData ? [responseData as any] : undefined
          } as unknown as Payment;
        })
      );

      console.log('Payments query result:', paymentsWithResponses);
      
      setPayments(paymentsWithResponses || []);
      console.log('Payments set to state:', paymentsWithResponses);
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