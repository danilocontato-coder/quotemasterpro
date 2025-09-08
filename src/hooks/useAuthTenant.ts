import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface TenantState {
  clientId: string | null;
  onboardingCompleted: boolean;
  isLoading: boolean;
}

interface AvailableClient {
  id: string;
  name: string;
  company_name?: string;
}

// Cache global para evitar fetches repetitivos
const TENANT_CACHE = new Map<string, { state: TenantState; timestamp: number }>();
const CLIENTS_CACHE = new Map<string, { clients: AvailableClient[]; timestamp: number }>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutos

export const useAuthTenant = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [tenantState, setTenantState] = useState<TenantState>({
    clientId: null,
    onboardingCompleted: false,
    isLoading: true
  });
  const [availableClients, setAvailableClients] = useState<AvailableClient[]>([]);
  const checkingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Função otimizada para verificar status do tenant
  const checkTenantStatus = useMemo(() => {
    return async (userId: string, userRole: string, supplierId?: string | null) => {
      // Prevenir múltiplas verificações simultâneas
      if (checkingRef.current) return;
      
      const cacheKey = userId;
      const cached = TENANT_CACHE.get(cacheKey);
      
      // Verificar cache válido
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        setTenantState(cached.state);
        return;
      }

      checkingRef.current = true;

      try {
        // ADMIN não precisa de vinculação com cliente
        if (userRole === 'admin') {
          const adminState: TenantState = {
            clientId: null,
            onboardingCompleted: true,
            isLoading: false
          };
          TENANT_CACHE.set(cacheKey, { state: adminState, timestamp: Date.now() });
          setTenantState(adminState);
          return;
        }

        // Para suppliers, verificar supplier_id
        if (userRole === 'supplier') {
          const supplierState: TenantState = {
            clientId: supplierId || null,
            onboardingCompleted: !!supplierId,
            isLoading: false
          };
          TENANT_CACHE.set(cacheKey, { state: supplierState, timestamp: Date.now() });
          setTenantState(supplierState);
          return;
        }

        // Para outros roles, buscar profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('client_id, onboarding_completed')
          .eq('id', userId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        const hasClientId = !!profile?.client_id;
        const shouldCompleteOnboarding = hasClientId && !profile?.onboarding_completed;

        // Auto-completar onboarding se necessário
        if (shouldCompleteOnboarding) {
          await supabase
            .from('profiles')
            .update({ onboarding_completed: true })
            .eq('id', userId);
        }

        const finalState: TenantState = {
          clientId: profile?.client_id || null,
          onboardingCompleted: hasClientId,
          isLoading: false
        };

        TENANT_CACHE.set(cacheKey, { state: finalState, timestamp: Date.now() });
        setTenantState(finalState);

        // Carregar clientes disponíveis se necessário
        if (!hasClientId) {
          await loadAvailableClients();
        }

      } catch (error) {
        console.error('Erro ao verificar tenant:', error);
        const errorState: TenantState = {
          clientId: null,
          onboardingCompleted: userRole === 'admin',
          isLoading: false
        };
        setTenantState(errorState);
      } finally {
        checkingRef.current = false;
      }
    };
  }, []);

  // Função para carregar clientes disponíveis
  const loadAvailableClients = async () => {
    const cacheKey = 'available-clients';
    const cached = CLIENTS_CACHE.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      setAvailableClients(cached.clients);
      return;
    }

    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, company_name')
        .eq('status', 'active')
        .order('name')
        .limit(50);

      if (error) throw error;

      const clientList = clients || [];
      CLIENTS_CACHE.set(cacheKey, { clients: clientList, timestamp: Date.now() });
      setAvailableClients(clientList);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  // Effect otimizado
  useEffect(() => {
    if (!user || !session) {
      setTenantState({
        clientId: null,
        onboardingCompleted: false,
        isLoading: false
      });
      setAvailableClients([]);
      lastUserIdRef.current = null;
      return;
    }

    // Só verificar se o usuário mudou
    if (lastUserIdRef.current !== user.id) {
      lastUserIdRef.current = user.id;
      
      // Pequeno delay para batching
      const timeoutId = setTimeout(() => {
        checkTenantStatus(user.id, user.role, user.supplierId);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [user?.id, user?.role, user?.supplierId, session?.access_token, checkTenantStatus]);

  const linkToClient = async (clientId: string): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase.rpc('link_user_to_client', {
        user_id: user.id,
        target_client_id: clientId
      });

      if (error) throw error;

      // Atualizar estado local
      const newState: TenantState = {
        clientId,
        onboardingCompleted: true,
        isLoading: false
      };
      
      TENANT_CACHE.set(user.id, { state: newState, timestamp: Date.now() });
      setTenantState(newState);

      toast({
        title: "Conta vinculada!",
        description: "Sua conta foi vinculada com sucesso ao cliente",
      });

      // Notificar atualização
      window.dispatchEvent(new CustomEvent('user-profile-updated'));
      return true;
    } catch (error) {
      console.error('Erro ao vincular usuário:', error);
      toast({
        title: "Erro na vinculação",
        description: "Não foi possível vincular sua conta ao cliente",
        variant: "destructive"
      });
      return false;
    }
  };

  const ensureBound = (): boolean => {
    if (user?.role === 'admin') return true;
    return tenantState.onboardingCompleted && !!tenantState.clientId;
  };

  const refreshTenantStatus = () => {
    if (user?.id) {
      // Limpar cache para forçar nova verificação
      TENANT_CACHE.delete(user.id);
      checkTenantStatus(user.id, user.role, user.supplierId);
    }
  };

  return {
    // Estado
    clientId: tenantState.clientId,
    onboardingCompleted: tenantState.onboardingCompleted,
    isLoading: tenantState.isLoading,
    availableClients,
    
    // Ações
    linkToClient,
    ensureBound,
    refreshTenantStatus,
    
    // Helpers
    needsOnboarding: !tenantState.onboardingCompleted && !tenantState.isLoading && user?.role !== 'admin',
    isReady: tenantState.onboardingCompleted || user?.role === 'admin'
  };
};