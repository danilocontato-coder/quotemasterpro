import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ContractHistory = Database['public']['Tables']['contract_history']['Row'];
type ContractHistoryInsert = Database['public']['Tables']['contract_history']['Insert'];

export const useContractHistory = (contractId: string) => {
  const [history, setHistory] = useState<ContractHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('contract_history')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar histórico',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addHistoryEvent = async (event: Omit<ContractHistoryInsert, 'contract_id' | 'changed_by'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('contract_history')
        .insert({
          ...event,
          contract_id: contractId,
          changed_by: user.id
        });

      if (error) throw error;

      await fetchHistory();
      
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar evento',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  useEffect(() => {
    if (contractId) {
      fetchHistory();
    }
  }, [contractId]);

  return {
    history,
    isLoading,
    addHistoryEvent,
    refreshHistory: fetchHistory
  };
};
