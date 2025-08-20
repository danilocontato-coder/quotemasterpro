import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface Payment {
  id: string;
  quote_id: string;
  client_id: string;
  supplier_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'disputed' | 'refunded';
  stripe_session_id?: string;
  escrow_release_date?: string;
  created_at: string;
  updated_at: string;
}

export const useSupabasePayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          quotes!inner(title, client_name, supplier_name),
          clients!inner(name),
          suppliers!inner(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
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

  const createPayment = async (paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single();

      if (error) throw error;

      // Add audit log
      await supabase.from('audit_logs').insert([{
        action: 'CREATE_PAYMENT',
        entity_type: 'payments',
        entity_id: data.id,
        details: { payment_data: paymentData }
      }]);

      await fetchPayments();
      toast({
        title: "Pagamento criado",
        description: "Pagamento registrado com sucesso."
      });
      return data;
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "Erro ao criar pagamento",
        description: "Não foi possível registrar o pagamento.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updatePaymentStatus = async (paymentId: string, status: Payment['status']) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', paymentId);

      if (error) throw error;

      // Add audit log
      await supabase.from('audit_logs').insert([{
        action: 'UPDATE_PAYMENT_STATUS',
        entity_type: 'payments',
        entity_id: paymentId,
        details: { new_status: status }
      }]);

      await fetchPayments();
      toast({
        title: "Status atualizado",
        description: "Status do pagamento foi atualizado com sucesso."
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status do pagamento.",
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
    createPayment,
    updatePaymentStatus,
    refetch: fetchPayments
  };
};