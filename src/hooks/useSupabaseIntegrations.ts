import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  const lastUserKeyRef = useRef<string>('');

  const loadIntegrations = useCallback(async () => {
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
  }, [user?.role, user?.clientId, user?.supplierId]);

  useEffect(() => {
    if (!user) return;
    
    // Create a stable key from user properties that matter for filtering
    const userKey = `${user.id}-${user.role}-${user.clientId || 'null'}-${user.supplierId || 'null'}`;
    
    // Only reload if user key actually changed AND we have a user
    if (userKey !== lastUserKeyRef.current) {
      console.log('User key changed, reloading integrations:', userKey);
      lastUserKeyRef.current = userKey;
      loadIntegrations();
    }
  }, [user?.id, user?.role, user?.clientId, user?.supplierId]);

  const filteredIntegrations = useMemo(() => {
    return integrations.filter(integration => {
      const matchesSearch = 
        integration.integration_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(integration.configuration).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || integration.integration_type === filterType;
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && integration.active) ||
        (filterStatus === 'inactive' && !integration.active);
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [integrations, searchTerm, filterType, filterStatus]);

  const getStats = useMemo((): IntegrationStats => {
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
  }, [integrations]);

  const createIntegration = useCallback(async (integrationData: {
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
      
      // Force reload to ensure sync
      setTimeout(() => {
        loadIntegrations();
      }, 500);
      
      return data;
    } catch (error) {
      console.error('Erro ao criar integração:', error);
      toast.error('Erro ao criar integração');
      throw error;
    }
  }, [user?.clientId, user?.supplierId, loadIntegrations]);

  const updateIntegration = useCallback(async (id: string, updates: Partial<Integration>) => {
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
  }, []);

  const deleteIntegration = useCallback(async (id: string) => {
    try {
      console.log('Iniciando exclusão da integração:', id);
      
      // Otimistic update - remove from UI immediately
      const originalIntegrations = [...integrations];
      setIntegrations(prev => prev.filter(int => int.id !== id));

      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro na exclusão:', error);
        // Rollback on error
        setIntegrations(originalIntegrations);
        toast.error(`Erro ao excluir integração: ${error.message || 'desconhecido'}`);
        throw error;
      }

      console.log('Integração excluída com sucesso:', id);
      toast.success('Integração excluída com sucesso!');
      
      // Force reload from database to ensure sync
      setTimeout(() => {
        loadIntegrations();
      }, 500);
    } catch (error: any) {
      console.error('Erro ao excluir integração:', error);
      if (!error?.message) {
        toast.error('Erro ao excluir integração');
      }
      throw error;
    }
  }, [integrations, loadIntegrations]);

  const toggleIntegrationStatus = useCallback(async (id: string) => {
    const integration = integrations.find(int => int.id === id);
    if (!integration) return;

    await updateIntegration(id, { active: !integration.active });
  }, [integrations, updateIntegration]);

  const testIntegration = useCallback(async (id: string): Promise<boolean> => {
    const integration = integrations.find(int => int.id === id);
    if (!integration) return false;

    try {
      const { data, error } = await supabase.functions.invoke('test-integration', {
        body: {
          integration_id: integration.id,
          integration_type: integration.integration_type,
          configuration: integration.configuration
        }
      });

      if (error) {
        console.error('Error testing integration:', error);
        toast.error(`Erro no teste: ${error.message}`);
        return false;
      }

      if (data?.success) {
        toast.success(data.message);
        return true;
      } else {
        toast.error(data?.message || 'Falha no teste de conexão');
        return false;
      }
    } catch (error: any) {
      console.error('Error testing integration:', error);
      toast.error('Erro ao testar integração');
      return false;
    }
  }, [integrations]);

  const forceRefresh = useCallback(async () => {
    console.log('Forçando refresh completo das integrações...');
    lastUserKeyRef.current = ''; // Clear cache to force reload
    await loadIntegrations();
  }, [loadIntegrations]);

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
    stats: getStats,
    refetch: loadIntegrations,
    forceRefresh
  };
}