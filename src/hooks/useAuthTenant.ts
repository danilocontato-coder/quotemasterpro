import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TenantState {
  clientId: string | null;
  onboardingCompleted: boolean;
  isLoading: boolean;
}

export const useAuthTenant = () => {
  const { user } = useAuth();
  const [tenantState, setTenantState] = useState<TenantState>({
    clientId: null,
    onboardingCompleted: false,
    isLoading: true
  });
  const [availableClients] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      setTenantState({
        clientId: null,
        onboardingCompleted: false,
        isLoading: false
      });
      return;
    }

    // ADMIN e SUPPLIER sempre completam onboarding
    if (user.role === 'admin' || user.role === 'supplier') {
      setTenantState({
        clientId: user.supplierId || null,
        onboardingCompleted: true,
        isLoading: false
      });
      return;
    }

    // Para outros roles, verificar clientId
    const hasClientId = !!user.clientId;
    setTenantState({
      clientId: user.clientId || null,
      onboardingCompleted: hasClientId,
      isLoading: false
    });
  }, [user?.id, user?.role, user?.clientId, user?.supplierId]);

  const linkToClient = async (clientId: string): Promise<boolean> => {
    return true; // Simplified
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