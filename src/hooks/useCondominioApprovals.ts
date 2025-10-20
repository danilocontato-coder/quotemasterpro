import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ApprovalService } from '@/services/ApprovalService';
import { useToast } from '@/hooks/use-toast';

export interface ApprovalWithQuote {
  id: string;
  quote_id: string;
  approver_id: string;
  status: string;
  comments: string | null;
  created_at: string;
  approved_at: string | null;
  quote: {
    id: string;
    title: string;
    description: string;
    total: number;
    status: string;
    created_at: string;
    client_name: string;
    on_behalf_of_client_id: string | null;
  };
}

export function useCondominioApprovals() {
  const [approvals, setApprovals] = useState<ApprovalWithQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchApprovals = async () => {
    if (!user?.clientId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('📋 [useCondominioApprovals] Buscando aprovações para condomínio:', user.clientId);

      // Buscar aprovações pendentes onde o condomínio é o cliente da cotação
      const { data, error } = await supabase
        .from('approvals')
        .select(`
          id,
          quote_id,
          approver_id,
          status,
          comments,
          created_at,
          approved_at,
          quotes:quote_id (
            id,
            title,
            description,
            total,
            status,
            created_at,
            client_name,
            on_behalf_of_client_id
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [useCondominioApprovals] Erro ao buscar aprovações:', error);
        throw error;
      }

      // Filtrar apenas aprovações de cotações deste condomínio
      const filteredApprovals = (data || [])
        .filter(approval => {
          const quote = approval.quotes as any;
          // Verificar se a cotação foi criada PARA este condomínio
          return quote && (
            quote.client_id === user.clientId || 
            quote.on_behalf_of_client_id
          );
        })
        .map(approval => ({
          ...approval,
          quote: approval.quotes as any
        }));

      console.log('✅ [useCondominioApprovals] Aprovações encontradas:', filteredApprovals.length);
      setApprovals(filteredApprovals as ApprovalWithQuote[]);
    } catch (error) {
      console.error('❌ [useCondominioApprovals] Erro:', error);
      toast({
        title: "Erro ao carregar aprovações",
        description: "Não foi possível carregar as aprovações pendentes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const approveQuote = async (approvalId: string, comments?: string) => {
    if (!user?.id) return;

    try {
      console.log('✅ [useCondominioApprovals] Aprovando cotação:', approvalId);
      
      await ApprovalService.approveQuote(approvalId, user.id, comments);
      
      toast({
        title: "Cotação aprovada!",
        description: "A cotação foi aprovada com sucesso"
      });

      // Atualizar lista
      await fetchApprovals();
    } catch (error) {
      console.error('❌ [useCondominioApprovals] Erro ao aprovar:', error);
      toast({
        title: "Erro ao aprovar cotação",
        description: "Não foi possível aprovar a cotação. Tente novamente.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const rejectQuote = async (approvalId: string, reason: string) => {
    if (!user?.id) return;

    if (!reason || reason.trim().length === 0) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da rejeição",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('❌ [useCondominioApprovals] Rejeitando cotação:', approvalId);
      
      await ApprovalService.rejectQuote(approvalId, user.id, reason);
      
      toast({
        title: "Cotação rejeitada",
        description: "A cotação foi rejeitada e o solicitante será notificado"
      });

      // Atualizar lista
      await fetchApprovals();
    } catch (error) {
      console.error('❌ [useCondominioApprovals] Erro ao rejeitar:', error);
      toast({
        title: "Erro ao rejeitar cotação",
        description: "Não foi possível rejeitar a cotação. Tente novamente.",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchApprovals();

    // Realtime subscription para atualizações
    const channel = supabase
      .channel('condominio-approvals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'approvals'
        },
        () => {
          console.log('🔄 [useCondominioApprovals] Aprovação atualizada, recarregando...');
          fetchApprovals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.clientId]);

  return {
    approvals,
    isLoading,
    approveQuote,
    rejectQuote,
    refetch: fetchApprovals
  };
}
