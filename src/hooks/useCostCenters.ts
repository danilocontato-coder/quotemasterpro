import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CostCenter {
  id: string;
  client_id: string;
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  budget_monthly: number;
  budget_annual: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  level?: number;
  path?: string;
}

export interface CostCenterSpending {
  cost_center_id: string;
  cost_center_name: string;
  cost_center_code: string;
  total_spent: number;
  quote_count: number;
  payment_count: number;
  budget_monthly: number;
  budget_annual: number;
  budget_variance_monthly: number;
  budget_variance_annual: number;
}

export function useCostCenters() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [spending, setSpending] = useState<CostCenterSpending[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCostCenters = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user's client_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (!profile?.client_id) {
        throw new Error('No client associated with user');
      }

      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('client_id', profile.client_id)
        .eq('active', true)
        .order('name');

      if (error) throw error;

      setCostCenters(data || []);
    } catch (err) {
      console.error('Error fetching cost centers:', err);
      setError('Erro ao carregar centros de custo');
      toast({
        title: 'Erro',
        description: 'Erro ao carregar centros de custo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHierarchy = async (clientId?: string) => {
    try {
      setIsLoading(true);
      
      let targetClientId = clientId;
      
      // If no clientId provided, get from current user
      if (!targetClientId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('id', user.id)
          .single();

        if (!profile?.client_id) throw new Error('No client associated with user');
        targetClientId = profile.client_id;
      }

      const { data, error } = await supabase.rpc('get_cost_center_hierarchy', {
        p_client_id: targetClientId,
      });

      if (error) throw error;

      // Map the hierarchy data to include missing fields
      const hierarchyData = (data || []).map((item: any) => ({
        ...item,
        client_id: targetClientId,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      setCostCenters(hierarchyData);
    } catch (err) {
      console.error('Error fetching cost center hierarchy:', err);
      setError('Erro ao carregar hierarquia de centros de custo');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSpending = async (clientId?: string, startDate?: string, endDate?: string) => {
    try {
      setIsLoading(true);
      
      let targetClientId = clientId;
      
      // If no clientId provided, get from current user
      if (!targetClientId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('id', user.id)
          .single();

        if (!profile?.client_id) throw new Error('No client associated with user');
        targetClientId = profile.client_id;
      }

      const { data, error } = await supabase.rpc('get_cost_center_spending', {
        p_client_id: targetClientId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;

      setSpending(data || []);
    } catch (err) {
      console.error('Error fetching cost center spending:', err);
      setError('Erro ao carregar gastos por centro de custo');
    } finally {
      setIsLoading(false);
    }
  };

  const createCostCenter = async (costCenter: Omit<CostCenter, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Get current user's client_id if not provided
      let targetClientId = costCenter.client_id;
      
      if (!targetClientId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('id', user.id)
          .single();

        if (!profile?.client_id) throw new Error('No client associated with user');
        targetClientId = profile.client_id;
      }

      const { data, error } = await supabase
        .from('cost_centers')
        .insert([{ ...costCenter, client_id: targetClientId }])
        .select()
        .single();

      if (error) throw error;

      setCostCenters(prev => [...prev, data]);
      
      toast({
        title: 'Sucesso',
        description: 'Centro de custo criado com sucesso',
      });

      return data;
    } catch (err) {
      console.error('Error creating cost center:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao criar centro de custo',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updateCostCenter = async (id: string, updates: Partial<CostCenter>) => {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setCostCenters(prev => prev.map(cc => cc.id === id ? data : cc));
      
      toast({
        title: 'Sucesso',
        description: 'Centro de custo atualizado com sucesso',
      });

      return data;
    } catch (err) {
      console.error('Error updating cost center:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar centro de custo',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const deleteCostCenter = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cost_centers')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;

      setCostCenters(prev => prev.filter(cc => cc.id !== id));
      
      toast({
        title: 'Sucesso',
        description: 'Centro de custo removido com sucesso',
      });
    } catch (err) {
      console.error('Error deleting cost center:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao remover centro de custo',
        variant: 'destructive',
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchCostCenters();
  }, []);

  return {
    costCenters,
    spending,
    isLoading,
    error,
    fetchCostCenters,
    fetchHierarchy,
    fetchSpending,
    createCostCenter,
    updateCostCenter,
    deleteCostCenter,
  };
}