import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SupplierTransfer {
  id: string;
  supplier_id: string;
  amount: number;
  transfer_method: 'PIX' | 'TED';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  asaas_transfer_id: string | null;
  bank_account: any;
  requested_at: string;
  processed_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useSupplierTransfers = () => {
  const [transfers, setTransfers] = useState<SupplierTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransfers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('supplier_transfers')
        .select('*')
        .order('requested_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setTransfers((data || []) as SupplierTransfer[]);
      console.log('[useSupplierTransfers] Transfers fetched:', data?.length);
    } catch (err: any) {
      console.error('[useSupplierTransfers] Error:', err);
      setError(err.message || 'Erro ao buscar transferências');
      toast.error('Erro ao carregar histórico de transferências');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();

    // Real-time subscription para atualizações
    const subscription = supabase
      .channel('supplier_transfers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supplier_transfers'
        },
        (payload) => {
          console.log('[useSupplierTransfers] Real-time update:', payload);
          fetchTransfers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Pendente',
      processing: 'Processando',
      completed: 'Concluída',
      failed: 'Falhou',
      cancelled: 'Cancelada'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-500',
      processing: 'bg-blue-500',
      completed: 'bg-green-500',
      failed: 'bg-red-500',
      cancelled: 'bg-gray-500'
    };
    return colorMap[status] || 'bg-gray-500';
  };

  return {
    transfers,
    isLoading,
    error,
    fetchTransfers,
    getStatusText,
    getStatusColor
  };
};
