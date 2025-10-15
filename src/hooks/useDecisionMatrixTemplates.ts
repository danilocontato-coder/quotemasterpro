import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DecisionMatrixTemplate {
  id: string;
  name: string;
  description: string | null;
  weights: {
    price: number;
    deliveryTime: number;
    shippingCost: number;
    deliveryScore: number;
    warranty: number;
    reputation: number;
  };
  is_system: boolean;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useDecisionMatrixTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['decision-matrix-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decision_matrix_templates')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as DecisionMatrixTemplate[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<DecisionMatrixTemplate, 'id' | 'created_at' | 'updated_at' | 'is_system' | 'client_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      const { data, error } = await supabase
        .from('decision_matrix_templates')
        .insert({
          ...template,
          client_id: profile?.client_id,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-matrix-templates'] });
      toast({
        title: 'Template criado',
        description: 'Template de matriz de decisão criado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('decision_matrix_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-matrix-templates'] });
      toast({
        title: 'Template excluído',
        description: 'Template de matriz de decisão excluído com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    templates,
    isLoading,
    createTemplate: createTemplate.mutate,
    deleteTemplate: deleteTemplate.mutate,
  };
}
