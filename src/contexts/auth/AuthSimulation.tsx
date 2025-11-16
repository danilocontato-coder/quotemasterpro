import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/systemLogger';
import { User, UserRole } from './AuthCore';

export const useAuthSimulation = (
  setUser: (user: User | null) => void,
  setIsLoading: (loading: boolean) => void,
  setError: (error: string | null) => void
) => {
  const simulateClientLogin = useCallback(async (adminData: any) => {
    setIsLoading(true);
    
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', adminData.targetClientId)
        .single();

      if (clientError || !clientData) {
        setError('Cliente não encontrado');
        setIsLoading(false);
        return;
      }

      const simulatedUser: User = {
        id: `admin_simulated_${adminData.targetClientId}`,
        email: clientData.email,
        name: adminData.targetClientName || clientData.name,
        role: 'manager' as UserRole,
        active: true,
        clientId: adminData.targetClientId,
        companyName: clientData.company_name || clientData.name
      };

      setUser(simulatedUser);
      setIsLoading(false);
    } catch (error) {
      logger.error('auth', 'Erro ao simular login de cliente', error);
      setError('Erro ao simular acesso como cliente');
      setIsLoading(false);
    }
  }, [setUser, setIsLoading, setError]);

  const simulateSupplierLogin = useCallback(async (adminData: any) => {
    setIsLoading(true);
    
    try {
      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', adminData.targetSupplierId)
        .single();

      if (supplierError || !supplierData) {
        setError('Fornecedor não encontrado');
        setIsLoading(false);
        return;
      }

      const simulatedUser: User = {
        id: `admin_simulated_${adminData.targetSupplierId}`,
        email: supplierData.email,
        name: adminData.targetSupplierName || supplierData.name,
        role: 'supplier' as UserRole,
        active: true,
        supplierId: adminData.targetSupplierId,
        companyName: supplierData.name
      };

      setUser(simulatedUser);
      setIsLoading(false);
    } catch (error) {
      logger.error('auth', 'Erro ao simular login de fornecedor', error);
      setError('Erro ao simular acesso como fornecedor');
      setIsLoading(false);
    }
  }, [setUser, setIsLoading, setError]);

  const checkAdminToken = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const adminToken = urlParams.get('adminToken');
    
    if (adminToken) {
      let adminData = sessionStorage.getItem(`adminAccess_${adminToken}`);
      if (!adminData) {
        adminData = localStorage.getItem(`adminAccess_${adminToken}`);
      }
      
      if (adminData) {
        try {
          const parsedData = JSON.parse(adminData);
          
          if (parsedData.targetRole === 'manager' && parsedData.targetClientId) {
            simulateClientLogin(parsedData);
            return true;
          } else if (parsedData.targetRole === 'supplier' && parsedData.targetSupplierId) {
            simulateSupplierLogin(parsedData);
            return true;
          }
        } catch (error) {
          logger.error('auth', 'Erro ao parsear admin token', error);
        }
      }
    }
    return false;
  }, [simulateClientLogin, simulateSupplierLogin]);

  return {
    simulateClientLogin,
    simulateSupplierLogin,
    checkAdminToken,
  };
};
