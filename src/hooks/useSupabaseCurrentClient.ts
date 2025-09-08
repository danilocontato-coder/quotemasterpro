import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClientInfo {
  id: string;
  name: string;
  email: string;
  cnpj: string;
  phone?: string;
  address?: string;
  company_name?: string;
  subscription_plan_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Cache global para evitar chamadas repetitivas
let clientCache: { data: ClientInfo | null; time: number; userId: string | null } = { 
  data: null, 
  time: 0, 
  userId: null 
};

export function useSupabaseCurrentClient() {
  const { user } = useAuth();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientInfo = useCallback(async () => {
    if (!user) {
      setClient(null);
      setIsLoading(false);
      return;
    }

    // Verificar cache (válido por 3 minutos para o mesmo usuário)
    const cacheAge = Date.now() - clientCache.time;
    if (clientCache.data && clientCache.userId === user.id && cacheAge < 3 * 60 * 1000) {
      setClient(clientCache.data);
      setIsLoading(false);
      return;
    }

    // Admin não tem client_id específico
    if (user.role === 'admin') {
      setClient(null);
      setIsLoading(false);
      return;
    }

    if (!user.clientId) {
      // Fallback para dados do usuário se não há clientId
      const fallbackClient = {
        id: user.id,
        name: user.companyName || user.name,
        email: user.email,
        cnpj: '',
        company_name: user.companyName,
        subscription_plan_id: 'basic',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Atualizar cache
      clientCache = { data: fallbackClient, time: Date.now(), userId: user.id };
      setClient(fallbackClient);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', user.clientId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Atualizar cache
        clientCache = { data, time: Date.now(), userId: user.id };
        setClient(data);
      } else {
        // Fallback se cliente não encontrado
        const fallbackClient = {
          id: user.id,
          name: user.companyName || user.name,
          email: user.email,
          cnpj: '',
          company_name: user.companyName,
          subscription_plan_id: 'basic',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        clientCache = { data: fallbackClient, time: Date.now(), userId: user.id };
        setClient(fallbackClient);
      }
    } catch (err) {
      console.error('Erro ao buscar informações do cliente:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar informações do cliente');
      
      // Fallback em caso de erro
      const errorFallbackClient = {
        id: user.id,
        name: user.companyName || user.name,
        email: user.email,
        cnpj: '',
        company_name: user.companyName,
        subscription_plan_id: 'basic',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      clientCache = { data: errorFallbackClient, time: Date.now(), userId: user.id };
      setClient(errorFallbackClient);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.clientId, user?.role, user?.companyName, user?.name, user?.email]);

  useEffect(() => {
    // Só buscar se o usuário mudou ou se não há dados no cache
    const shouldFetch = !client || clientCache.userId !== user?.id;
    if (user && shouldFetch) {
      fetchClientInfo();
    } else if (!user) {
      setClient(null);
      setIsLoading(false);
    }
  }, [user?.id, fetchClientInfo, client]);

  const updateClient = async (updates: Partial<ClientInfo>) => {
    if (!client || !user?.clientId) return;

    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', user.clientId);

      if (error) throw error;

      const updatedClient = { ...client, ...updates };
      
      // Atualizar cache e estado
      clientCache = { data: updatedClient, time: Date.now(), userId: user.id };
      setClient(updatedClient);
    } catch (err) {
      console.error('Error updating client:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar cliente');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    client,
    isLoading,
    error,
    updateClient,
    refetch: fetchClientInfo,
    // Dados derivados para facilitar o uso
    clientName: client?.name || client?.company_name || user?.companyName || user?.name || '',
    subscriptionPlan: client?.subscription_plan_id || 'basic',
    clientStatus: client?.status || 'active',
    clientEmail: client?.email || user?.email || '',
  };
}