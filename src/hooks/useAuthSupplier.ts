import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SupplierState {
  supplierId: string | null;
  onboardingCompleted: boolean;
  isLoading: boolean;
}

interface AvailableSupplier {
  id: string;
  name: string;
  cnpj?: string;
}

export const useAuthSupplier = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [supplierState, setSupplierState] = useState<SupplierState>({
    supplierId: null,
    onboardingCompleted: false,
    isLoading: true
  });
  const [availableSuppliers, setAvailableSuppliers] = useState<AvailableSupplier[]>([]);

  // Verificar estado do fornecedor quando user/session mudar
  useEffect(() => {
    if (!user || !session) {
      setSupplierState({
        supplierId: null,
        onboardingCompleted: false,
        isLoading: false
      });
      return;
    }

    checkSupplierStatus();
  }, [user?.id, session]);

  const checkSupplierStatus = async () => {
    if (!user?.id) return;

    try {
      setSupplierState(prev => ({ ...prev, isLoading: true }));

      // Buscar profile atualizado
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('supplier_id, onboarding_completed, tenant_type, role')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar supplier:', error);
        throw error;
      }

      const hasSupplierId = !!profile?.supplier_id;
      
      // Se tem supplier_id mas onboarding não foi marcado como completed, auto-completar
      if (hasSupplierId && !profile?.onboarding_completed) {
        console.log('🔧 Auto-completando onboarding para fornecedor já vinculado');
        await supabase
          .from('profiles')
          .update({ 
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }

      setSupplierState({
        supplierId: profile?.supplier_id || null,
        onboardingCompleted: hasSupplierId, // Se tem supplier_id, considera completo
        isLoading: false
      });

      // Se não tem supplier_id, buscar fornecedores disponíveis (para casos específicos)
      if (!hasSupplierId && profile?.role === 'supplier') {
        await loadAvailableSuppliers();
      }

    } catch (error) {
      console.error('Erro ao verificar status do fornecedor:', error);
      setSupplierState({
        supplierId: null,
        onboardingCompleted: false,
        isLoading: false
      });
    }
  };

  const loadAvailableSuppliers = async () => {
    try {
      // Buscar fornecedores disponíveis (admin pode ver todos)
      const { data: suppliers, error } = await supabase
        .from('suppliers')
        .select('id, name, cnpj')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Erro ao buscar fornecedores:', error);
        return;
      }

      setAvailableSuppliers(suppliers || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores disponíveis:', error);
    }
  };

  const linkToSupplier = async (supplierId: string): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return false;
    }

    try {
      console.log('🔗 Vinculando usuário ao fornecedor:', { userId: user.id, supplierId });

      // Atualizar profile diretamente (não há RPC específica para fornecedores)
      const { error } = await supabase
        .from('profiles')
        .update({ 
          supplier_id: supplierId,
          role: 'supplier',
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Erro ao vincular usuário ao fornecedor:', error);
        toast({
          title: "Erro na vinculação",
          description: error.message || "Não foi possível vincular sua conta ao fornecedor",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ Usuário vinculado ao fornecedor com sucesso');

      // Atualizar estado local
      setSupplierState({
        supplierId,
        onboardingCompleted: true,
        isLoading: false
      });

      toast({
        title: "Conta vinculada!",
        description: "Sua conta foi vinculada com sucesso ao fornecedor",
      });

      return true;
    } catch (error) {
      console.error('Erro inesperado ao vincular usuário ao fornecedor:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao vincular conta",
        variant: "destructive"
      });
      return false;
    }
  };

  const ensureBound = (): boolean => {
    return supplierState.onboardingCompleted && !!supplierState.supplierId;
  };

  const refreshSupplierStatus = () => {
    checkSupplierStatus();
  };

  return {
    // Estado
    supplierId: supplierState.supplierId,
    onboardingCompleted: supplierState.onboardingCompleted,
    isLoading: supplierState.isLoading,
    availableSuppliers,
    
    // Ações
    linkToSupplier,
    ensureBound,
    refreshSupplierStatus,
    
    // Helpers
    needsOnboarding: !supplierState.onboardingCompleted && !supplierState.isLoading,
    isReady: supplierState.onboardingCompleted && !!supplierState.supplierId
  };
};