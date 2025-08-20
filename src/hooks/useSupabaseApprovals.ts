import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface Approval {
  id: string;
  quote_id: string;
  approver_id: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export const useSupabaseApprovals = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchApprovals = async () => {
    try {
      const { data, error } = await supabase
        .from('approvals')
        .select(`
          *,
          quotes!inner(title, description, total, client_name, status),
          profiles!inner(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApprovals(data || []);
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

  const createApproval = async (approvalData: Omit<Approval, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('approvals')
        .insert([approvalData])
        .select()
        .single();

      if (error) throw error;

      // Add audit log
      await supabase.from('audit_logs').insert([{
        action: 'CREATE_APPROVAL',
        entity_type: 'approvals',
        entity_id: data.id,
        details: { approval_data: approvalData }
      }]);

      await fetchApprovals();
      toast({
        title: "Aprovação criada",
        description: "Solicitação de aprovação enviada com sucesso."
      });
      return data;
    } catch (error) {
      console.error('Error creating approval:', error);
      toast({
        title: "Erro ao criar aprovação",
        description: "Não foi possível criar a solicitação de aprovação.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const processApproval = async (approvalId: string, status: 'approved' | 'rejected', comments?: string) => {
    try {
      const updateData: any = {
        status,
        comments,
        updated_at: new Date().toISOString()
      };

      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('approvals')
        .update(updateData)
        .eq('id', approvalId);

      if (error) throw error;

      // Update quote status based on approval
      if (status === 'approved') {
        const approval = approvals.find(a => a.id === approvalId);
        if (approval) {
          await supabase
            .from('quotes')
            .update({ status: 'approved' })
            .eq('id', approval.quote_id);
        }
      }

      // Add audit log
      await supabase.from('audit_logs').insert([{
        action: status === 'approved' ? 'APPROVE_QUOTE' : 'REJECT_QUOTE',
        entity_type: 'approvals',
        entity_id: approvalId,
        details: { status, comments }
      }]);

      await fetchApprovals();
      toast({
        title: status === 'approved' ? "Cotação aprovada" : "Cotação rejeitada",
        description: `A cotação foi ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso.`
      });
    } catch (error) {
      console.error('Error processing approval:', error);
      toast({
        title: "Erro ao processar aprovação",
        description: "Não foi possível processar a aprovação.",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Real-time subscription
  useEffect(() => {
    fetchApprovals();

    const channel = supabase
      .channel('approvals-changes')
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
  }, []);

  return {
    approvals,
    isLoading,
    createApproval,
    processApproval,
    refetch: fetchApprovals
  };
};