import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ApproverProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  client_id: string | null;
}

/**
 * Hook to fetch potential approvers from profiles table
 * This ensures we're using auth.users IDs which is what approvals.approver_id references
 */
export const useSupabaseApprovers = () => {
  const [approvers, setApprovers] = useState<ApproverProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchApprovers = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      let query = supabase
        .from('profiles')
        .select('id, name, email, role, active, client_id')
        .eq('active', true)
        .order('name', { ascending: true });

      // Filter by client if not admin
      if (user.role !== 'admin' && user.clientId) {
        query = query.eq('client_id', user.clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter only users with roles that can approve
      const approversList = (data || []).filter(profile => 
        profile.role === 'admin' || 
        profile.role === 'manager' || 
        profile.role === 'admin_cliente'
      );

      setApprovers(approversList as ApproverProfile[]);
    } catch (error) {
      console.error('Error fetching approvers:', error);
      toast.error('Erro ao carregar aprovadores');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovers();
  }, [user]);

  return {
    approvers,
    isLoading,
    refetch: fetchApprovers
  };
};
