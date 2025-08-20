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
      setIsLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
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
    refetch: fetchPayments
  };
};