import { useState, useEffect } from 'react';
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

export const useAuthTenant = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [tenantState, setTenantState] = useState<TenantState>({
    clientId: null,
    onboardingCompleted: false,
    isLoading: true
  });
  const [availableClients, setAvailableClients] = useState<AvailableClient[]>([]);

  // Verificar estado do tenant quando user/session mudar
  useEffect(() => {
    if (!user || !session) {
      setTenantState({
        clientId: null,
        onboardingCompleted: false,
        isLoading: false
      });
      return;
    }

    checkTenantStatus();
  }, [user?.id, session]);

  const checkTenantStatus = async () => {
    if (!user?.id) return;

    try {
      setTenantState(prev => ({ ...prev, isLoading: true }));

      // Buscar profile atualizado
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('client_id, onboarding_completed, tenant_type')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar tenant:', error);
        throw error;
      }

      const hasClientId = !!profile?.client_id;
      
      // Se tem client_id mas onboarding não foi marcado como completed, auto-completar
      if (hasClientId && !profile?.onboarding_completed) {
        console.log('🔧 Auto-completando onboarding para usuário já vinculado');
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
      }

      setTenantState({
        clientId: profile?.client_id || null,
        onboardingCompleted: hasClientId, // Se tem client_id, considera completo
        isLoading: false
      });

      // Se não tem client_id, buscar clientes disponíveis
      if (!hasClientId) {
        await loadAvailableClients();
      }

    } catch (error) {
      console.error('Erro ao verificar status do tenant:', error);
      setTenantState({
        clientId: null,
        onboardingCompleted: false,
        isLoading: false
      });
    }
  };

  const loadAvailableClients = async () => {
    try {
      // Buscar clientes disponíveis (admin pode ver todos, outros apenas seus)
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, company_name')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Erro ao buscar clientes:', error);
        return;
      }

      setAvailableClients(clients || []);
    } catch (error) {
      console.error('Erro ao carregar clientes disponíveis:', error);
    }
  };

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
      console.log('🔗 Vinculando usuário ao cliente:', { userId: user.id, clientId });

      // Chamar função RPC para vincular usuário ao cliente
      const { data, error } = await supabase.rpc('link_user_to_client', {
        user_id: user.id,
        target_client_id: clientId
      });

      if (error) {
        console.error('Erro ao vincular usuário ao cliente:', error);
        toast({
          title: "Erro na vinculação",
          description: error.message || "Não foi possível vincular sua conta ao cliente",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ Usuário vinculado com sucesso:', data);

      // Atualizar estado local
      setTenantState({
        clientId,
        onboardingCompleted: true,
        isLoading: false
      });

      toast({
        title: "Conta vinculada!",
        description: "Sua conta foi vinculada com sucesso ao cliente",
      });

      // Não fazer reload - notificar contexto para atualizar
      window.dispatchEvent(new CustomEvent('user-profile-updated'));

      return true;
    } catch (error) {
      console.error('Erro inesperado ao vincular usuário:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao vincular conta",
        variant: "destructive"
      });
      return false;
    }
  };

  const ensureBound = (): boolean => {
    return tenantState.onboardingCompleted && !!tenantState.clientId;
  };

  const refreshTenantStatus = () => {
    checkTenantStatus();
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
    needsOnboarding: !tenantState.onboardingCompleted && !tenantState.isLoading,
    isReady: tenantState.onboardingCompleted && !!tenantState.clientId
  };
};