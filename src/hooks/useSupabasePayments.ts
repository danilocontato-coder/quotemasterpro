import { useState, useEffect, useRef, useCallback } from 'react';
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
  issued_by: string | null;
  invoice_number: string | null;
  invoice_issued_at: string | null;
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
}

export const useSupabasePayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const lastSyncTime = useRef<number>(0);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    console.log('🔍 [Payments] Iniciando busca de pagamentos...');
    
    try {
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
          clients(id, name)
        `)
        .order('created_at', { ascending: false });

      if (paymentsError) {
        console.error('❌ [Payments] Erro na query:', {
          code: paymentsError.code,
          message: paymentsError.message,
          details: paymentsError.details,
          hint: paymentsError.hint
        });
        throw paymentsError;
      }

      console.log('✅ [Payments] Busca concluída:', {
        count: paymentsData?.length || 0,
        sample: paymentsData?.[0]?.id || 'nenhum'
      });

      setPayments(paymentsData as any);
    } catch (error: any) {
      console.error('💥 [Payments] Erro fatal ao buscar pagamentos:', error);
      toast({
        title: 'Erro ao carregar pagamentos',
        description: error.message || error.hint || 'Erro desconhecido ao buscar pagamentos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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
  }, [fetchPayments, toast]);

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