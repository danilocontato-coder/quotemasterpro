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
  const { user } = useAuth();
  const { toast } = useToast();
  const [tenantState, setTenantState] = useState<TenantState>({
    clientId: null,
    onboardingCompleted: false,
    isLoading: true
  });
  const [availableClients, setAvailableClients] = useState<AvailableClient[]>([]);

  useEffect(() => {
    if (!user) {
      setTenantState({
        clientId: null,
        onboardingCompleted: false,
        isLoading: false
      });
      setAvailableClients([]);
      return;
    }

    const checkTenantStatus = async () => {
      try {
        // ADMIN não precisa de vinculação com cliente
        if (user.role === 'admin') {
          setTenantState({
            clientId: null,
            onboardingCompleted: true,
            isLoading: false
          });
          return;
        }

        // Para suppliers, verificar supplier_id
        if (user.role === 'supplier') {
          setTenantState({
            clientId: user.supplierId || null,
            onboardingCompleted: !!user.supplierId,
            isLoading: false
          });
          return;
        }

        // Para outros roles, usar clientId do usuário
        const hasClientId = !!user.clientId;
        
        setTenantState({
          clientId: user.clientId || null,
          onboardingCompleted: hasClientId,
          isLoading: false
        });

        // Carregar clientes disponíveis se necessário
        if (!hasClientId) {
          const { data: clients } = await supabase
            .from('clients')
            .select('id, name, company_name')
            .eq('status', 'active')
            .order('name')
            .limit(50);

          setAvailableClients(clients || []);
        }

      } catch (error) {
        console.error('Erro ao verificar tenant:', error);
        setTenantState({
          clientId: null,
          onboardingCompleted: user.role === 'admin',
          isLoading: false
        });
      }
    };

    checkTenantStatus();
  }, [user?.id, user?.role, user?.clientId, user?.supplierId]);

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

      setTenantState({
        clientId,
        onboardingCompleted: true,
        isLoading: false
      });

      toast({
        title: "Conta vinculada!",
        description: "Sua conta foi vinculada com sucesso ao cliente",
      });

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

  return {
    clientId: tenantState.clientId,
    onboardingCompleted: tenantState.onboardingCompleted,
    isLoading: tenantState.isLoading,
    availableClients,
    linkToClient,
    needsOnboarding: !tenantState.onboardingCompleted && !tenantState.isLoading && user?.role !== 'admin',
    isReady: tenantState.onboardingCompleted || user?.role === 'admin'
  };
};