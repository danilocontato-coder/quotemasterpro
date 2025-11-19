import { useState, useEffect, useRef } from 'react';
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
  const lastSyncTime = useRef<number>(0);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching payments...');
      
      // Query única com LEFT JOIN (abordagem original que funcionava)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          quotes(
            id, 
            local_code, 
            title, 
            total, 
            client_name, 
            supplier_id, 
            suppliers(id, name, asaas_wallet_id)
          ),
          suppliers(id, name, asaas_wallet_id),
          clients(id, name),
          quote_responses!left(
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

      if (paymentsError) {
        console.error('Payments fetch error:', paymentsError);
        throw paymentsError;
      }

      // Filtrar apenas responses aprovadas no JavaScript
      const paymentsWithApprovedResponses = (paymentsData || []).map(payment => ({
        ...payment,
        quote_responses: Array.isArray(payment.quote_responses)
          ? payment.quote_responses.filter((r: any) => r.status === 'approved')
          : []
      }));

      console.log('Payments query result:', paymentsWithApprovedResponses);
      setPayments(paymentsWithApprovedResponses as any);
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

  // Real-time subscription com debounce
  useEffect(() => {
    fetchPayments();
    
    let timeoutId: NodeJS.Timeout;
    
    const channel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          console.log('🔔 Pagamento atualizado em tempo real:', payload);
          
          // ✅ Debounce: aguarda 2s antes de refetch
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            console.log('🔄 [Payments] Refetch após mudanças agrupadas');
            fetchPayments();
          }, 2000);
          
          // Toast para atualizações importantes
          if (payload.eventType === 'UPDATE') {
            const newStatus = (payload.new as any).status;
            const oldStatus = (payload.old as any)?.status;
            
            if (newStatus === 'completed' && oldStatus !== 'completed') {
              toast({
                title: "Pagamento confirmado",
                description: "Um pagamento foi automaticamente confirmado.",
              });
            } else if (newStatus === 'in_escrow' && oldStatus === 'pending') {
              toast({
                title: "Pagamento recebido",
                description: "Um pagamento foi recebido e está em garantia.",
              });
            } else if (newStatus === 'overdue' && oldStatus !== 'overdue') {
              toast({
                title: "Pagamento vencido",
                description: "Um pagamento está vencido.",
                variant: "destructive"
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [toast]);

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