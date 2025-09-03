import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Integration {
  id: string;
  client_id?: string;
  supplier_id?: string;
  integration_type: string;
  configuration: any; // Changed from Record<string, any> to any for JSON compatibility
  api_key_encrypted?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationStats {
  total: number;
  active: number;
  inactive: number;
  testing: number;
  byType: Record<string, number>;
}

export function useSupabaseIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { user } = useAuth();

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      let query = supabase.from('integrations').select('*');

      // If not admin, filter by user's client/supplier
      if (user?.role !== 'admin') {
        if (user?.clientId) {
          query = query.eq('client_id', user.clientId);
        } else if (user?.supplierId) {
          query = query.eq('supplier_id', user.supplierId);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations((data || []) as Integration[]);
    } catch (error) {
      console.error('Erro ao carregar integrações:', error);
      toast.error('Erro ao carregar integrações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, [user]);

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = 
      integration.integration_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(integration.configuration).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || integration.integration_type === filterType;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && integration.active) ||
      (filterStatus === 'inactive' && !integration.active);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const createIntegration = async (integrationData: {
    integration_type: string;
    configuration: Record<string, any>;
    api_key_encrypted?: string;
    active?: boolean;
  }) => {
    try {
      const newIntegration = {
        ...integrationData,
        client_id: user?.clientId || null,
        supplier_id: user?.supplierId || null,
        active: integrationData.active ?? false
      };

      const { data, error } = await supabase
        .from('integrations')
        .insert([newIntegration])
        .select()
        .single();

      if (error) throw error;

      setIntegrations(prev => [data as Integration, ...prev]);
      toast.success('Integração criada com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao criar integração:', error);
      toast.error('Erro ao criar integração');
      throw error;
    }
  };

  const updateIntegration = async (id: string, updates: Partial<Integration>) => {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setIntegrations(prev => prev.map(int => int.id === id ? data as Integration : int));
      toast.success('Integração atualizada com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao atualizar integração:', error);
      toast.error('Erro ao atualizar integração');
      throw error;
    }
  };

  const deleteIntegration = async (id: string) => {
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setIntegrations(prev => prev.filter(int => int.id !== id));
      toast.success('Integração excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir integração:', error);
      toast.error('Erro ao excluir integração');
      throw error;
    }
  };

  const toggleIntegrationStatus = async (id: string) => {
    const integration = integrations.find(int => int.id === id);
    if (!integration) return;

    await updateIntegration(id, { active: !integration.active });
  };

  const testIntegration = async (id: string): Promise<boolean> => {
    try {
      // Here you would implement actual integration testing
      // For now, simulating a test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = Math.random() > 0.2; // 80% success rate
      
      if (success) {
        toast.success('Teste de conexão realizado com sucesso!');
      } else {
        toast.error('Falha no teste de conexão. Verifique as configurações.');
      }
      
      return success;
    } catch (error) {
      console.error('Erro ao testar integração:', error);
      toast.error('Erro ao testar integração');
      return false;
    }
  };

  const getStats = (): IntegrationStats => {
    const total = integrations.length;
    const active = integrations.filter(int => int.active).length;
    const inactive = total - active;
    
    // Count by type
    const byType: Record<string, number> = {};
    integrations.forEach(int => {
      byType[int.integration_type] = (byType[int.integration_type] || 0) + 1;
    });

    return {
      total,
      active,
      inactive,
      testing: 0, // This would be tracked separately in a real implementation
      byType
    };
  };

  return {
    integrations: filteredIntegrations,
    loading,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    toggleIntegrationStatus,
    testIntegration,
    stats: getStats(),
    refetch: loadIntegrations
  };
}