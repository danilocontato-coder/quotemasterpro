import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SavedDecisionMatrix {
  id: string;
  name: string;
  quote_id: string;
  quote_title: string;
  client_id: string;
  weights: {
    price: number;
    deliveryTime: number;
    shippingCost: number;
    sla: number;
    warranty: number;
    reputation: number;
  };
  proposals: any[];
  created_at: string;
  updated_at: string;
}

export function useSavedDecisionMatrices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: matrices = [], isLoading } = useQuery({
    queryKey: ['saved-decision-matrices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_decision_matrices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SavedDecisionMatrix[];
    },
  });

  const saveMatrix = useMutation({
    mutationFn: async (matrix: Omit<SavedDecisionMatrix, 'id' | 'created_at' | 'updated_at' | 'client_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (!profile?.client_id) throw new Error('Cliente não encontrado');

      const { data, error } = await supabase
        .from('saved_decision_matrices')
        .insert({
          ...matrix,
          client_id: profile.client_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-decision-matrices'] });
      toast({
        title: 'Matriz salva',
        description: 'Matriz de decisão salva com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar matriz',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMatrix = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_decision_matrices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-decision-matrices'] });
      toast({
        title: 'Matriz excluída',
        description: 'Matriz de decisão excluída com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir matriz',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const exportMatrix = (matrix: SavedDecisionMatrix) => {
    const data = {
      ...matrix,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matriz-${matrix.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Matriz exportada!',
      description: 'Arquivo JSON baixado com sucesso.',
    });
  };

  return {
    matrices,
    isLoading,
    saveMatrix: saveMatrix.mutate,
    deleteMatrix: deleteMatrix.mutate,
    exportMatrix,
  };
}
