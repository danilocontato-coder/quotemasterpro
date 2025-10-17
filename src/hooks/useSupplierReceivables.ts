import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SupplierReceivable {
  id: string;
  quote_id: string;
  quote_local_code?: string;
  amount: number;
  status: 'pending' | 'in_escrow' | 'completed' | 'failed' | 'manual_confirmation';
  created_at: string;
  completed_at?: string;
  client_id: string;
  quote_title?: string;
  client_name?: string;
  payment_method?: string;
}

export interface ReceivablesMetrics {
  totalReceived: number;
  pendingAmount: number;
  thisMonthReceived: number;
  averageTicket: number;
  totalTransactions: number;
}

export const useSupplierReceivables = () => {
  const [receivables, setReceivables] = useState<SupplierReceivable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchReceivables = async () => {
    if (!user?.supplierId) {
      setReceivables([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Buscar pagamentos onde o fornecedor é o beneficiário
      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select(`
          id,
          quote_id,
          amount,
          status,
          created_at,
          payment_method,
          client_id,
          quotes!inner(title, client_name, local_code)
        `)
        .eq('supplier_id', user.supplierId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching receivables:', error);
        throw error;
      }

      const formattedReceivables: SupplierReceivable[] = (paymentsData || []).map(payment => ({
        id: payment.id,
        quote_id: payment.quote_id,
        quote_local_code: payment.quotes?.local_code,
        amount: payment.amount,
        status: payment.status as any,
        created_at: payment.created_at,
        client_id: payment.client_id,
        payment_method: payment.payment_method,
        quote_title: payment.quotes?.title,
        client_name: payment.quotes?.client_name
      }));

      setReceivables(formattedReceivables);
    } catch (error) {
      console.error('Error fetching supplier receivables:', error);
      setReceivables([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();

    // Real-time subscription para atualizações
    const channel = supabase
      .channel('supplier-payments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `supplier_id=eq.${user?.supplierId}`
        },
        () => {
          fetchReceivables();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.supplierId]);

  const metrics = useMemo((): ReceivablesMetrics => {
    const completedReceivables = receivables.filter(r => r.status === 'completed');
    const totalReceived = completedReceivables.reduce((sum, r) => sum + r.amount, 0);
    
    const pendingReceivables = receivables.filter(r => 
      r.status === 'pending' || r.status === 'in_escrow'
    );
    const pendingAmount = pendingReceivables.reduce((sum, r) => sum + r.amount, 0);

    // Recebimentos deste mês
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthReceivables = completedReceivables.filter(r => {
      const receivableDate = new Date(r.created_at);
      return receivableDate.getMonth() === currentMonth && 
             receivableDate.getFullYear() === currentYear;
    });
    const thisMonthReceived = thisMonthReceivables.reduce((sum, r) => sum + r.amount, 0);

    const averageTicket = completedReceivables.length > 0 
      ? totalReceived / completedReceivables.length 
      : 0;

    return {
      totalReceived,
      pendingAmount,
      thisMonthReceived,
      averageTicket,
      totalTransactions: receivables.length
    };
  }, [receivables]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Aguardando Pagamento';
      case 'in_escrow': return 'Em Garantia';
      case 'completed': return 'Recebido';
      case 'failed': return 'Falhou';
      case 'manual_confirmation': return 'Aguardando Confirmação';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'in_escrow': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'manual_confirmation': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return {
    receivables,
    metrics,
    isLoading,
    getStatusText,
    getStatusColor,
    refreshReceivables: fetchReceivables
  };
};