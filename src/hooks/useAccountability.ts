import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type RecordType = 'purchase' | 'service' | 'maintenance' | 'other';
export type RecordStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface AccountabilityRecord {
  id: string;
  payment_id: string | null;
  client_id: string;
  cost_center_id: string | null;
  record_type: RecordType;
  destination: string;
  amount_spent: number;
  accountability_date: string;
  status: RecordStatus;
  submitted_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  payments?: {
    id: string;
    quote_id: string;
  };
  cost_centers?: {
    name: string;
    code: string;
  };
  clients?: {
    name: string;
  };
}

export interface CreateAccountabilityRecordInput {
  payment_id?: string;
  client_id: string;
  cost_center_id?: string;
  record_type: RecordType;
  destination: string;
  amount_spent: number;
  accountability_date: string;
  status?: RecordStatus;
  metadata?: any;
}

export function useAccountability(clientId?: string) {
  const [records, setRecords] = useState<AccountabilityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('accountability_records')
        .select(`
          *,
          payments(id, quote_id),
          cost_centers(name, code),
          clients(name)
        `)
        .order('accountability_date', { ascending: false });

      if (clientId && clientId !== 'all') {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecords((data || []) as AccountabilityRecord[]);
    } catch (error: any) {
      console.error('Error fetching accountability records:', error);
      toast({
        title: 'Erro ao carregar registros',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createRecord = async (input: CreateAccountabilityRecordInput) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('accountability_records')
        .insert({
          ...input,
          submitted_by: userData.user?.id,
          status: input.status || 'draft',
        })
        .select(`
          *,
          payments(id, quote_id),
          cost_centers(name, code),
          clients(name)
        `)
        .single();

      if (error) throw error;

      toast({
        title: 'Registro criado',
        description: 'Prestação de contas registrada com sucesso.',
      });

      await fetchRecords();
      return data;
    } catch (error: any) {
      console.error('Error creating accountability record:', error);
      toast({
        title: 'Erro ao criar registro',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateRecord = async (id: string, updates: Partial<AccountabilityRecord>) => {
    try {
      const { error } = await supabase
        .from('accountability_records')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Registro atualizado',
        description: 'Prestação de contas atualizada com sucesso.',
      });

      await fetchRecords();
    } catch (error: any) {
      console.error('Error updating accountability record:', error);
      toast({
        title: 'Erro ao atualizar registro',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const approveRecord = async (id: string, notes?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('accountability_records')
        .update({
          status: 'approved',
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          approval_notes: notes,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Registro aprovado',
        description: 'Prestação de contas aprovada com sucesso.',
      });

      await fetchRecords();
    } catch (error: any) {
      console.error('Error approving accountability record:', error);
      toast({
        title: 'Erro ao aprovar registro',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const rejectRecord = async (id: string, reason: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('accountability_records')
        .update({
          status: 'rejected',
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          approval_notes: reason,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Registro rejeitado',
        description: 'Prestação de contas rejeitada.',
        variant: 'destructive',
      });

      await fetchRecords();
    } catch (error: any) {
      console.error('Error rejecting accountability record:', error);
      toast({
        title: 'Erro ao rejeitar registro',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accountability_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Registro excluído',
        description: 'Prestação de contas excluída com sucesso.',
      });

      await fetchRecords();
    } catch (error: any) {
      console.error('Error deleting accountability record:', error);
      toast({
        title: 'Erro ao excluir registro',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchRecords();

    // Realtime subscription
    const channel = supabase
      .channel('accountability_records_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accountability_records',
        },
        () => {
          fetchRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  return {
    records,
    isLoading,
    refetch: fetchRecords,
    createRecord,
    updateRecord,
    approveRecord,
    rejectRecord,
    deleteRecord,
  };
}
