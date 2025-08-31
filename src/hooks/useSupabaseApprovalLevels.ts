import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  order_level: number;
}

export const useSupabaseApprovalLevels = () => {
  const [approvalLevels, setApprovalLevels] = useState<ApprovalLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchApprovalLevels = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      let query = supabase
        .from('approval_levels')
        .select('*')
        .order('order_level', { ascending: true });

      // Filter by client if not admin
      if (user.role !== 'admin' && user.clientId) {
        query = query.eq('client_id', user.clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApprovalLevels(data || []);
    } catch (error) {
      console.error('Error fetching approval levels:', error);
      toast({
        title: "Erro ao carregar níveis de aprovação",
        description: "Não foi possível carregar os níveis de aprovação.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createApprovalLevel = async (levelData: Omit<ApprovalLevel, 'id' | 'created_at' | 'updated_at' | 'client_id'>) => {
    if (!user || !user.clientId) return null;

    try {
      const newLevel = {
        ...levelData,
        client_id: user.clientId,
      };

      const { data, error } = await supabase
        .from('approval_levels')
        .insert(newLevel)
        .select()
        .single();

      if (error) throw error;

      setApprovalLevels(prev => [...prev, data].sort((a, b) => a.order_level - b.order_level));
      
      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'CREATE',
        entity_type: 'approval_levels',
        entity_id: data.id,
        panel_type: 'client',
        details: { name: data.name, amount_threshold: data.amount_threshold }
      });

      toast({
        title: "Nível criado",
        description: "Nível de aprovação criado com sucesso.",
      });

      return data;
    } catch (error) {
      console.error('Error creating approval level:', error);
      toast({
        title: "Erro ao criar nível",
        description: "Não foi possível criar o nível de aprovação.",
        variant: "destructive"
      });
      return null;
    }
  };

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

      // Create audit log
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'UPDATE',
          entity_type: 'approval_levels',
          entity_id: id,
          panel_type: user.role === 'admin' ? 'admin' : 'client',
          details: updates
        });
      }

      toast({
        title: "Nível atualizado",
        description: "Nível de aprovação atualizado com sucesso.",
      });

      return data;
    } catch (error) {
      console.error('Error updating approval level:', error);
      toast({
        title: "Erro ao atualizar nível",
        description: "Não foi possível atualizar o nível de aprovação.",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteApprovalLevel = async (id: string) => {
    try {
      const { error } = await supabase
        .from('approval_levels')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setApprovalLevels(prev => prev.filter(level => level.id !== id));

      // Create audit log
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'DELETE',
          entity_type: 'approval_levels',
          entity_id: id,
          panel_type: user.role === 'admin' ? 'admin' : 'client',
          details: { deleted: true }
        });
      }

      toast({
        title: "Nível excluído",
        description: "Nível de aprovação excluído com sucesso.",
      });

      return true;
    } catch (error) {
      console.error('Error deleting approval level:', error);
      toast({
        title: "Erro ao excluir nível",
        description: "Não foi possível excluir o nível de aprovação.",
        variant: "destructive"
      });
      return false;
    }
  };

  const getApprovalLevelForAmount = (amount: number) => {
    return approvalLevels
      .filter(level => level.active && amount >= level.amount_threshold)
      .sort((a, b) => b.amount_threshold - a.amount_threshold)[0] || null;
  };

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchApprovalLevels();

    const subscription = supabase
      .channel('approval_levels_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'approval_levels'
        },
        (payload) => {
          console.log('Approval level change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newLevel = payload.new as ApprovalLevel;
            if (user.role === 'admin' || newLevel.client_id === user.clientId) {
              setApprovalLevels(prev => [...prev, newLevel].sort((a, b) => a.order_level - b.order_level));
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedLevel = payload.new as ApprovalLevel;
            setApprovalLevels(prev => 
              prev.map(level => level.id === updatedLevel.id ? updatedLevel : level)
                .sort((a, b) => a.order_level - b.order_level)
            );
          } else if (payload.eventType === 'DELETE') {
            setApprovalLevels(prev => prev.filter(level => level.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const filteredApprovalLevels = approvalLevels.filter(level =>
    level.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return {
    approvalLevels: filteredApprovalLevels,
    isLoading,
    searchTerm,
    setSearchTerm,
    createApprovalLevel,
    updateApprovalLevel,
    deleteApprovalLevel,
    getApprovalLevelForAmount,
    refetch: fetchApprovalLevels,
  };
};