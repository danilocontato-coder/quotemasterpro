import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ApprovalLevel {
  id: string;
  name: string;
  active: boolean;
  approvers: string[];
  created_at: string;
  updated_at: string;
  client_id: string;
  amount_threshold: number;
  max_amount_threshold: number | null;
  order_level: number;
}

export interface CondominioUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UseCondominioApprovalLevelsProps {
  condominioId: string | null;
}

export const useCondominioApprovalLevels = ({ condominioId }: UseCondominioApprovalLevelsProps) => {
  const [approvalLevels, setApprovalLevels] = useState<ApprovalLevel[]>([]);
  const [condominioUsers, setCondominioUsers] = useState<CondominioUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const { toast } = useToast();

  // Fetch approval levels for specific condominio
  const fetchApprovalLevels = useCallback(async () => {
    if (!condominioId) {
      setApprovalLevels([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('approval_levels')
        .select('*')
        .eq('client_id', condominioId)
        .order('order_level', { ascending: true });

      if (error) throw error;
      
      console.log('📋 [useCondominioApprovalLevels] Níveis carregados:', data?.length);
      setApprovalLevels(data || []);
    } catch (error) {
      console.error('❌ [useCondominioApprovalLevels] Erro:', error);
      toast({
        title: "Erro ao carregar níveis",
        description: "Não foi possível carregar os níveis de aprovação.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [condominioId, toast]);

  // Fetch users from condominio for approver selection
  const fetchCondominioUsers = useCallback(async () => {
    if (!condominioId) {
      setCondominioUsers([]);
      return;
    }

    try {
      setIsLoadingUsers(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('client_id', condominioId)
        .in('role', ['manager', 'admin_cliente', 'collaborator']);

      if (error) throw error;
      
      console.log('👥 [useCondominioApprovalLevels] Usuários carregados:', data?.length);
      setCondominioUsers(data || []);
    } catch (error) {
      console.error('❌ [useCondominioApprovalLevels] Erro ao buscar usuários:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [condominioId]);

  // Create new approval level
  const createApprovalLevel = async (levelData: {
    name: string;
    amount_threshold: number;
    max_amount_threshold: number | null;
    approvers: string[];
    order_level: number;
    active: boolean;
  }) => {
    if (!condominioId) return null;

    try {
      const newLevel = {
        ...levelData,
        client_id: condominioId,
      };

      const { data, error } = await supabase
        .from('approval_levels')
        .insert(newLevel)
        .select()
        .single();

      if (error) throw error;

      setApprovalLevels(prev => [...prev, data].sort((a, b) => a.order_level - b.order_level));
      
      toast({
        title: "Nível criado",
        description: "Nível de aprovação criado com sucesso.",
      });

      return data;
    } catch (error) {
      console.error('❌ [useCondominioApprovalLevels] Erro ao criar:', error);
      toast({
        title: "Erro ao criar nível",
        description: "Não foi possível criar o nível de aprovação.",
        variant: "destructive"
      });
      return null;
    }
  };

  // Update approval level
  const updateApprovalLevel = async (id: string, updates: Partial<ApprovalLevel>) => {
    try {
      const { data, error } = await supabase
        .from('approval_levels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setApprovalLevels(prev => 
        prev.map(level => level.id === id ? { ...level, ...data } : level)
          .sort((a, b) => a.order_level - b.order_level)
      );

      toast({
        title: "Nível atualizado",
        description: "Nível de aprovação atualizado com sucesso.",
      });

      return data;
    } catch (error) {
      console.error('❌ [useCondominioApprovalLevels] Erro ao atualizar:', error);
      toast({
        title: "Erro ao atualizar nível",
        description: "Não foi possível atualizar o nível de aprovação.",
        variant: "destructive"
      });
      return null;
    }
  };

  // Delete approval level
  const deleteApprovalLevel = async (id: string) => {
    try {
      const { error } = await supabase
        .from('approval_levels')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setApprovalLevels(prev => prev.filter(level => level.id !== id));

      toast({
        title: "Nível excluído",
        description: "Nível de aprovação excluído com sucesso.",
      });

      return true;
    } catch (error) {
      console.error('❌ [useCondominioApprovalLevels] Erro ao excluir:', error);
      toast({
        title: "Erro ao excluir nível",
        description: "Não foi possível excluir o nível de aprovação.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Copy default levels from administradora
  const copyDefaultLevels = async (administradoraId: string) => {
    if (!condominioId) return false;

    try {
      // Fetch administradora levels
      const { data: adminLevels, error: fetchError } = await supabase
        .from('approval_levels')
        .select('*')
        .eq('client_id', administradoraId)
        .eq('active', true)
        .order('order_level', { ascending: true });

      if (fetchError) throw fetchError;

      if (!adminLevels || adminLevels.length === 0) {
        toast({
          title: "Sem níveis padrão",
          description: "A administradora não possui níveis de aprovação configurados.",
          variant: "destructive"
        });
        return false;
      }

      // Create copies for condominio
      const newLevels = adminLevels.map(level => ({
        name: level.name,
        amount_threshold: level.amount_threshold,
        max_amount_threshold: level.max_amount_threshold,
        order_level: level.order_level,
        active: true,
        approvers: [], // Approvers need to be set for condominio
        client_id: condominioId,
      }));

      const { data, error } = await supabase
        .from('approval_levels')
        .insert(newLevels)
        .select();

      if (error) throw error;

      setApprovalLevels(prev => [...prev, ...(data || [])].sort((a, b) => a.order_level - b.order_level));

      toast({
        title: "Níveis copiados",
        description: `${data?.length || 0} níveis foram copiados com sucesso.`,
      });

      return true;
    } catch (error) {
      console.error('❌ [useCondominioApprovalLevels] Erro ao copiar:', error);
      toast({
        title: "Erro ao copiar níveis",
        description: "Não foi possível copiar os níveis de aprovação.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Get approval level for specific amount
  const getApprovalLevelForAmount = (amount: number) => {
    return approvalLevels
      .filter(level => 
        level.active &&
        amount >= level.amount_threshold &&
        (level.max_amount_threshold === null || amount <= level.max_amount_threshold)
      )
      .sort((a, b) => a.order_level - b.order_level)[0] || null;
  };

  // Get user name by ID
  const getUserNameById = (userId: string): string => {
    const user = condominioUsers.find(u => u.id === userId);
    return user?.name || user?.email || userId;
  };

  // Initial fetch
  useEffect(() => {
    fetchApprovalLevels();
    fetchCondominioUsers();
  }, [fetchApprovalLevels, fetchCondominioUsers]);

  // Real-time subscription
  useEffect(() => {
    if (!condominioId) return;

    const channel = supabase
      .channel(`approval_levels_${condominioId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'approval_levels',
          filter: `client_id=eq.${condominioId}`
        },
        (payload) => {
          console.log('🔄 [useCondominioApprovalLevels] Alteração:', payload.eventType);
          fetchApprovalLevels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [condominioId, fetchApprovalLevels]);

  return {
    approvalLevels,
    condominioUsers,
    isLoading,
    isLoadingUsers,
    createApprovalLevel,
    updateApprovalLevel,
    deleteApprovalLevel,
    copyDefaultLevels,
    getApprovalLevelForAmount,
    getUserNameById,
    refetch: fetchApprovalLevels,
  };
};
