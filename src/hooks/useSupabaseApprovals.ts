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
      setIsLoading(true);
      // Simple query without complex relations until types are updated
      const { data, error } = await supabase
        .from('approvals' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Approvals fetch error:', error);
        throw error;
      }
      
      setApprovals((data as unknown as Approval[]) || []);
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

  // Real-time subscription
  useEffect(() => {
    fetchApprovals();
  }, []);

  return {
    approvals,
    isLoading,
    refetch: fetchApprovals
  };
};