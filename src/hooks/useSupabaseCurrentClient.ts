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

  useEffect(() => {
    if (!user?.id) {
      setClient(null);
      setIsLoading(false);
      return;
    }

    const fetchClientInfo = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Admin não precisa de cliente específico
        if (user.role === 'admin') {
          setClient(null);
          setIsLoading(false);
          return;
        }

        if (!user.clientId) {
          // Criar cliente fallback baseado no usuário
          const fallbackClient: ClientInfo = {
            id: user.id,
            name: user.companyName || user.name || 'Cliente',
            email: user.email || '',
            cnpj: '',
            company_name: user.companyName,
            subscription_plan_id: 'plan-basic',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          setClient(fallbackClient);
        } else {
          const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', user.clientId)
            .maybeSingle();

          if (error) throw error;

          const clientData = data || {
            id: user.id,
            name: user.companyName || user.name || 'Cliente',
            email: user.email || '',
            cnpj: '',
            company_name: user.companyName,
            subscription_plan_id: 'plan-basic',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          setClient(clientData);
        }
      } catch (err) {
        console.error('Erro ao buscar cliente:', err);
        setError(err instanceof Error ? err.message : 'Erro ao buscar cliente');
        
        // Fallback em caso de erro
        const errorClient: ClientInfo = {
          id: user.id,
          name: user.companyName || user.name || 'Cliente',
          email: user.email || '',
          cnpj: '',
          company_name: user.companyName,
          subscription_plan_id: 'plan-basic',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        setClient(errorClient);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientInfo();
  }, [user?.id, user?.clientId, user?.role]);

  return {
    client: client || null,
    data: client || null,
    isLoading,
    error,
    refetch: () => {
      if (user?.id) {
        // Re-trigger the effect by changing a dependency
      }
    },
    clientName: client?.name || client?.company_name || user?.companyName || user?.name || '',
    subscriptionPlan: client?.subscription_plan_id || 'plan-basic',
    clientStatus: client?.status || 'active',
    clientEmail: client?.email || user?.email || '',
  };
}