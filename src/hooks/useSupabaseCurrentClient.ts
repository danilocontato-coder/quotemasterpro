import { useState, useEffect, useRef, useMemo } from 'react';
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

// Cache global com TTL otimizado
const CLIENT_CACHE = new Map<string, { data: ClientInfo; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function useSupabaseCurrentClient() {
  const { user } = useAuth();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Função otimizada para buscar cliente
  const fetchClientInfo = useMemo(() => {
    return async (userId: string, clientId?: string | null, userRole?: string) => {
      // Prevenir múltiplas chamadas simultâneas
      if (fetchingRef.current) return;
      
      const cacheKey = `${userId}-${clientId}`;
      const cached = CLIENT_CACHE.get(cacheKey);
      
      // Verificar cache válido
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        setClient(cached.data);
        setIsLoading(false);
        return;
      }

      // Admin não precisa de cliente específico
      if (userRole === 'admin') {
        setClient(null);
        setIsLoading(false);
        return;
      }

      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        if (!clientId) {
          // Criar cliente fallback baseado no usuário
          const fallbackClient: ClientInfo = {
            id: userId,
            name: user?.companyName || user?.name || 'Cliente',
            email: user?.email || '',
            cnpj: '',
            company_name: user?.companyName,
            subscription_plan_id: 'plan-basic',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          CLIENT_CACHE.set(cacheKey, { data: fallbackClient, timestamp: Date.now() });
          setClient(fallbackClient);
        } else {
          const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .maybeSingle();

          if (error) throw error;

          const clientData = data || {
            id: userId,
            name: user?.companyName || user?.name || 'Cliente',
            email: user?.email || '',
            cnpj: '',
            company_name: user?.companyName,
            subscription_plan_id: 'plan-basic',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          CLIENT_CACHE.set(cacheKey, { data: clientData, timestamp: Date.now() });
          setClient(clientData);
        }
      } catch (err) {
        console.error('Erro ao buscar cliente:', err);
        setError(err instanceof Error ? err.message : 'Erro ao buscar cliente');
        
        // Fallback em caso de erro
        const errorClient: ClientInfo = {
          id: userId,
          name: user?.companyName || user?.name || 'Cliente',
          email: user?.email || '',
          cnpj: '',
          company_name: user?.companyName,
          subscription_plan_id: 'plan-basic',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        CLIENT_CACHE.set(cacheKey, { data: errorClient, timestamp: Date.now() });
        setClient(errorClient);
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    };
  }, [user]);

  // Effect otimizado que só executa quando necessário
  useEffect(() => {
    if (!user?.id) {
      setClient(null);
      setIsLoading(false);
      lastUserIdRef.current = null;
      return;
    }

    // Só buscar se o usuário mudou
    if (lastUserIdRef.current !== user.id) {
      lastUserIdRef.current = user.id;
      fetchClientInfo(user.id, user.clientId, user.role);
    }
  }, [user?.id, user?.clientId, user?.role, fetchClientInfo]);

  return {
    client: client || null,
    data: client || null, // Compatibilidade com o hook original
    isLoading,
    error,
    refetch: () => {
      if (user?.id) {
        // Limpar cache para forçar nova busca
        const cacheKey = `${user.id}-${user.clientId}`;
        CLIENT_CACHE.delete(cacheKey);
        fetchClientInfo(user.id, user.clientId, user.role);
      }
    },
    // Dados derivados
    clientName: client?.name || client?.company_name || user?.companyName || user?.name || '',
    subscriptionPlan: client?.subscription_plan_id || 'plan-basic',
    clientStatus: client?.status || 'active',
    clientEmail: client?.email || user?.email || '',
  };
}