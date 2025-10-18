import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdministradora } from '@/contexts/AdministradoraContext';
import { toast } from 'sonner';

export interface AdministradoraApproval {
  id: string;
  quote_id: string;
  approver_id: string | null;
  status: string;
  comments: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  quotes: {
    id: string;
    local_code: string;
    title: string;
    client_name: string;
    supplier_name: string | null;
    total: number;
    items_count: number;
    deadline: string | null;
    client_id: string;
    on_behalf_of_client_id: string | null;
  } | null;
}

export function useAdministradoraApprovals() {
  const { currentClientId, adminClientId, condominios } = useAdministradora();
  const [approvals, setApprovals] = useState<AdministradoraApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchApprovals = async () => {
    if (!adminClientId) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('approvals')
        .select(`
          *,
          quotes (
            id,
            local_code,
            title,
            client_name,
            supplier_name,
            total,
            items_count,
            deadline,
            client_id,
            on_behalf_of_client_id
          )
        `)
        .order('created_at', { ascending: false });

      if (currentClientId === 'all') {
        // Buscar todas as aprovações da administradora e condomínios vinculados
        const condominioIds = condominios.map(c => c.id);
        const allClientIds = [adminClientId, ...condominioIds];
        
        query = query.or(
          `quotes.client_id.in.(${allClientIds.join(',')}),quotes.on_behalf_of_client_id.in.(${allClientIds.join(',')})`
        );
      } else if (currentClientId) {
        // Filtrar por condomínio específico
        query = query.or(
          `quotes.client_id.eq.${currentClientId},quotes.on_behalf_of_client_id.eq.${currentClientId}`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      setApprovals(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar aprovações:', error);
      toast.error('Erro ao carregar aprovações');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();

    // Subscrever a mudanças em tempo real
    const channel = supabase
      .channel('administradora-approvals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'approvals'
        },
        () => {
          fetchApprovals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentClientId, adminClientId, condominios.length]);

  const approveRequest = async (approvalId: string, comments?: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('approvals')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          comments: comments || null
        })
        .eq('id', approvalId);

      if (error) throw error;

      toast.success('Aprovação realizada com sucesso!');
      await fetchApprovals();
      return true;
    } catch (error: any) {
      console.error('Erro ao aprovar:', error);
      toast.error('Erro ao aprovar solicitação');
      return false;
    }
  };

  const rejectRequest = async (approvalId: string, comments: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('approvals')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          comments
        })
        .eq('id', approvalId);

      if (error) throw error;

      toast.success('Aprovação rejeitada');
      await fetchApprovals();
      return true;
    } catch (error: any) {
      console.error('Erro ao rejeitar:', error);
      toast.error('Erro ao rejeitar solicitação');
      return false;
    }
  };

  return {
    approvals,
    isLoading,
    refetch: fetchApprovals,
    approveRequest,
    rejectRequest
  };
}
