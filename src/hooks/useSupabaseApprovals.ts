import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { ApprovalService } from '@/services/ApprovalService';

export interface Approval {
  id: string;
  quote_id: string;
  approver_id: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  quotes?: {
    id: string;
    title: string;
    description?: string;
    total: number;
    client_id?: string;
    client_name: string;
    supplier_name?: string;
    status: string;
    deadline?: string;
    items_count?: number;
    created_at: string;
  };
}

export const useSupabaseApprovals = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchApprovals = async () => {
    if (!user) {
      console.log('🚫 useSupabaseApprovals: No user found');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔍 useSupabaseApprovals: Fetching approvals for user:', {
        id: user.id,
        role: user.role,
        clientId: user.clientId
      });
      
      let query = supabase
        .from('approvals')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros baseados no role do usuário ANTES de buscar
      if (user.role !== 'admin') {
        if (user.role === 'client' && user.clientId) {
          console.log('📋 useSupabaseApprovals: User is client, will filter by client quotes');
          // Para clientes, primeiro buscar IDs das cotações do cliente
          const { data: clientQuotes } = await supabase
            .from('quotes')
            .select('id')
            .eq('client_id', user.clientId);
          
          const quoteIds = clientQuotes?.map(q => q.id) || [];
          console.log('📋 useSupabaseApprovals: Client quote IDs:', quoteIds);
          
          if (quoteIds.length > 0) {
            query = query.in('quote_id', quoteIds);
          } else {
            // Se não há cotações do cliente, retornar vazio
            setApprovals([]);
            setIsLoading(false);
            return;
          }
        } else {
          console.log('👤 useSupabaseApprovals: Filtering by approver_id:', user.id);
          // Usuário vê apenas aprovações onde ele é o aprovador
          query = query.eq('approver_id', user.id);
        }
      } else {
        console.log('👑 useSupabaseApprovals: Admin user, showing all approvals');
      }

      // Buscar aprovações com filtro aplicado
      const { data: approvalsData, error: approvalsError } = await query;
      
      if (approvalsError) {
        console.error('❌ useSupabaseApprovals: Fetch error:', approvalsError);
        throw approvalsError;
      }

      // Depois buscar dados das cotações relacionadas
      let approvalsWithQuotes: Approval[] = [];
      
      if (approvalsData && approvalsData.length > 0) {
        const quoteIds = [...new Set(approvalsData.map(a => a.quote_id))];
        
        const { data: quotesData } = await supabase
          .from('quotes')
          .select(`
            id,
            title,
            description,
            total,
            client_id,
            client_name,
            supplier_name,
            status,
            deadline,
            items_count,
            created_at
          `)
          .in('id', quoteIds);

        // Combinar aprovações com dados das cotações
        approvalsWithQuotes = approvalsData.map(approval => ({
          ...approval,
          quotes: quotesData?.find(quote => quote.id === approval.quote_id)
        })) as Approval[];
      }

      console.log('✅ useSupabaseApprovals: Data processed:', {
        count: approvalsWithQuotes?.length || 0,
        data: approvalsWithQuotes?.slice(0, 2) // Log first 2 items for debug
      });
      
      setApprovals(approvalsWithQuotes || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      toast({
        title: "Erro ao carregar aprovações",
        description: "Não foi possível carregar a lista de aprovações.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Aprovar cotação
  const approveRequest = async (approvalId: string, comments?: string) => {
    if (!user) return false;

    try {
      await ApprovalService.approveQuote(approvalId, user.id, comments);
      
      // Atualizar estado local
      setApprovals(prev => 
        prev.map(approval => 
          approval.id === approvalId 
            ? { ...approval, status: 'approved', approved_at: new Date().toISOString(), comments }
            : approval
        )
      );

      toast({
        title: "Cotação aprovada",
        description: "A cotação foi aprovada com sucesso.",
      });

      return true;
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Erro ao aprovar",
        description: "Não foi possível aprovar a cotação.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Rejeitar cotação
  const rejectRequest = async (approvalId: string, comments: string) => {
    if (!user) return false;

    try {
      await ApprovalService.rejectQuote(approvalId, user.id, comments);
      
      // Atualizar estado local
      setApprovals(prev => 
        prev.map(approval => 
          approval.id === approvalId 
            ? { ...approval, status: 'rejected', approved_at: new Date().toISOString(), comments }
            : approval
        )
      );

      toast({
        title: "Cotação rejeitada",
        description: "A cotação foi rejeitada.",
      });

      return true;
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Erro ao rejeitar",
        description: "Não foi possível rejeitar a cotação.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchApprovals();

    const approvalSubscription = supabase
      .channel('approvals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'approvals'
        },
        (payload) => {
          console.log('Approval change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newApproval = payload.new as Approval;
            setApprovals(prev => [newApproval, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedApproval = payload.new as Approval;
            setApprovals(prev => 
              prev.map(approval => approval.id === updatedApproval.id ? updatedApproval : approval)
            );
          } else if (payload.eventType === 'DELETE') {
            setApprovals(prev => prev.filter(approval => approval.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to quotes changes for related data updates
    const quotesSubscription = supabase
      .channel('quotes_changes_for_approvals')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quotes'
        },
        () => {
          // Refetch approvals when quotes are updated to get fresh data
          fetchApprovals();
        }
      )
      .subscribe();

    return () => {
      approvalSubscription.unsubscribe();
      quotesSubscription.unsubscribe();
    };
  }, [user]);

  const fixQuoteApprovalStatus = async (quoteId: string) => {
    try {
      setIsLoading(true);
      await ApprovalService.fixQuoteApprovalStatus(quoteId);
      await fetchApprovals(); // Refresh the data
      return true;
    } catch (error) {
      console.error('Error fixing quote approval status:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    approvals,
    isLoading,
    approveRequest,
    rejectRequest,
    fixQuoteApprovalStatus,
    refetch: fetchApprovals
  };
};