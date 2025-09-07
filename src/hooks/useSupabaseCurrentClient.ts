import { useState, useEffect } from 'react';
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

export function useSupabaseCurrentClient() {
  const { user } = useAuth();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientInfo = async () => {
    console.log('🔍 DEBUG: fetchClientInfo iniciado', {
      userId: user?.id,
      clientId: user?.clientId,
      userRole: user?.role
    });

    if (!user?.clientId) {
      console.log('⚠️ DEBUG: Usuário sem clientId, usando dados do usuário');
      // If user doesn't have a clientId, create basic info from user data
      if (user) {
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
        console.log('💡 DEBUG: Cliente fallback criado:', fallbackClient);
        setClient(fallbackClient);
      }
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('📋 DEBUG: Buscando cliente no banco:', user.clientId);

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', user.clientId)
        .maybeSingle();

      console.log('📋 DEBUG: Resultado da busca:', { data, error });

      if (error) throw error;

      if (data) {
        console.log('✅ DEBUG: Cliente encontrado:', {
          id: data.id,
          name: data.name,
          subscription_plan_id: data.subscription_plan_id
        });
        setClient(data);
      } else {
        console.log('⚠️ DEBUG: Cliente não encontrado, usando fallback');
        // Fallback to user data if no client found
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
        console.log('💡 DEBUG: Cliente fallback criado:', fallbackClient);
        setClient(fallbackClient);
      }
    } catch (err) {
      console.error('❌ DEBUG: Erro ao buscar informações do cliente:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar informações do cliente');
      
      // Fallback to user data
      if (user) {
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
        console.log('🆘 DEBUG: Cliente fallback por erro criado:', errorFallbackClient);
        setClient(errorFallbackClient);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      // Call function directly to avoid dependency issues
      const loadClientData = async () => {
        await fetchClientInfo();
      };
      loadClientData();
    } else {
      setClient(null);
      setIsLoading(false);
    }
  }, [user?.id, user?.clientId]); // Only depend on specific user properties

  const updateClient = async (updates: Partial<ClientInfo>) => {
    if (!client || !user?.clientId) return;

    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', user.clientId);

      if (error) throw error;

      setClient(prev => prev ? { ...prev, ...updates } : null);
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
    // Dados derivados para facilitar o uso
    clientName: client?.name || client?.company_name || user?.companyName || user?.name || '',
    subscriptionPlan: client?.subscription_plan_id || 'basic',
    clientStatus: client?.status || 'active',
    clientEmail: client?.email || user?.email || '',
  };
}