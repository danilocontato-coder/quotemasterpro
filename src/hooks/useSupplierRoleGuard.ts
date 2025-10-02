import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook de proteção para rotas de fornecedor
 * Garante que apenas usuários com role 'supplier' podem acessar
 * Se usuário logado não for fornecedor, força logout e redireciona
 */
export const useSupplierRoleGuard = (options?: { redirectTo?: string }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const redirectTo = options?.redirectTo || '/supplier/auth';

  useEffect(() => {
    if (isLoading) return;

    // ⛔ VALIDAÇÃO CRÍTICA: Usuário logado mas não é fornecedor
    if (user && user.role !== 'supplier') {
      console.error('⛔ [SECURITY] Non-supplier user blocked from supplier area:', {
        userId: user.id,
        email: user.email,
        role: user.role,
        attemptedAccess: window.location.pathname
      });

      toast({
        title: "Acesso Negado",
        description: "Esta área é exclusiva para fornecedores. Faça login com uma conta de fornecedor.",
        variant: "destructive"
      });

      // Forçar logout e redirecionar
      supabase.auth.signOut().then(() => {
        navigate(redirectTo, { replace: true });
      });
      return;
    }

    // Se não está autenticado, redirecionar para login de fornecedor
    if (!user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, isLoading, navigate, toast, redirectTo]);

  return {
    isAuthorized: user?.role === 'supplier',
    isLoading
  };
};
