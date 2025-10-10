import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Contract = Database['public']['Tables']['contracts']['Row'];
type ContractInsert = Database['public']['Tables']['contracts']['Insert'];
type ContractUpdate = Database['public']['Tables']['contracts']['Update'];

export const useContracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchContracts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error: any) {
      console.error('Error fetching contracts:', error);
      toast({
        title: 'Erro ao carregar contratos',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createContract = async (contract: ContractInsert) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('contracts')
        .insert({
          ...contract,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Contrato criado',
        description: 'Contrato criado com sucesso'
      });

      fetchContracts();
      return data;
    } catch (error: any) {
      console.error('Error creating contract:', error);
      toast({
        title: 'Erro ao criar contrato',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }
  };

  const updateContract = async (id: string, updates: ContractUpdate) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Contrato atualizado',
        description: 'Contrato atualizado com sucesso'
      });

      fetchContracts();
      return true;
    } catch (error: any) {
      console.error('Error updating contract:', error);
      toast({
        title: 'Erro ao atualizar contrato',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const deleteContract = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Contrato excluído',
        description: 'Contrato excluído com sucesso'
      });

      fetchContracts();
      return true;
    } catch (error: any) {
      console.error('Error deleting contract:', error);
      toast({
        title: 'Erro ao excluir contrato',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  return {
    contracts,
    isLoading,
    createContract,
    updateContract,
    deleteContract,
    refreshContracts: fetchContracts
  };
};
