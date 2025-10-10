import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useAuthTenant } from '@/hooks/useAuthTenant';

import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
  adminOnly?: boolean;
  requireClientType?: 'direct' | 'administradora' | 'condominio_vinculado';
  blockClientType?: string[]; // Bloquear tipos específicos de cliente
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/auth/login',
  adminOnly = false,
  requireClientType,
  blockClientType
}) => {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: tenantLoading } = useAuthTenant();
  const [clientType, setClientType] = React.useState<string | null>(null);
  const [clientTypeLoading, setClientTypeLoading] = React.useState(true);
  
  const location = useLocation();
  const hasAdminToken = typeof window !== 'undefined' && new URLSearchParams(location.search).has('adminToken');

  // Buscar client_type quando necessário
  React.useEffect(() => {
    const fetchClientType = async () => {
      if (!user?.clientId || user.role === 'admin') {
        setClientType(null);
        setClientTypeLoading(false);
        return;
      }

      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('clients')
          .select('client_type')
          .eq('id', user.clientId)
          .single();

        if (!error && data) {
          setClientType(data.client_type);
        }
      } catch (err) {
        console.error('Erro ao buscar client_type:', err);
      } finally {
        setClientTypeLoading(false);
      }
    };

    if (requireClientType || blockClientType) {
      fetchClientType();
    } else {
      setClientTypeLoading(false);
    }
  }, [user?.clientId, user?.role, requireClientType, blockClientType]);

  // Loading states
  if (authLoading || tenantLoading || clientTypeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    // Se há um adminToken na URL, aguardar inicialização do modo admin
    if (hasAdminToken) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="space-y-4 w-full max-w-md">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        </div>
      );
    }
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }


  // PROTEÇÃO CRÍTICA: Apenas admins podem acessar rotas administrativas
  if (adminOnly && user.role !== 'admin') {
    console.warn('🔒 [SECURITY] Acesso negado: usuário não-admin tentou acessar rota administrativa');
    return <Navigate to="/" replace />;
  }

  // PROTEÇÃO: Verificar client_type se necessário
  if (requireClientType && clientType !== requireClientType) {
    console.warn(`🔒 [SECURITY] Acesso negado: client_type "${clientType}" não autorizado (requer "${requireClientType}")`);
    return <Navigate to="/dashboard" replace />;
  }

  // PROTEÇÃO: Bloquear client_types específicos
  if (blockClientType && clientType && blockClientType.includes(clientType)) {
    console.warn(`🔒 [SECURITY] Acesso negado: client_type "${clientType}" está bloqueado`);
    return <Navigate to="/dashboard" replace />;
  }

  // Check role-based access
  const isSupplierContext = !!user.supplierId;
  if (allowedRoles) {
    // SEGURANÇA: Bloquear acesso de clientes/fornecedores às rotas de admin
    if (allowedRoles.includes('admin') && user.role !== 'admin') {
      console.warn(`🔒 [SECURITY] Acesso negado: usuário ${user.role} tentou acessar rota de admin`);
      return <Navigate to="/" replace />;
    }

    // Special case: supplier context users (any role) can access supplier routes
    if (allowedRoles.includes('supplier') && isSupplierContext) {
      return <>{children}</>;
    }

    if (!allowedRoles.includes(user.role)) {
      console.warn(`🔒 [SECURITY] Acesso negado: role ${user.role} não autorizado para ${allowedRoles.join(', ')}`);
      // Redirecionar para dashboard apropriado baseado no role/contexto
      const dashboardMap: Record<string, string> = {
        admin: '/admin/superadmin',
        client: '/dashboard',
        manager: '/dashboard',
        collaborator: '/dashboard',
        supplier: '/supplier',
        support: '/support'
      };
      return <Navigate to={dashboardMap[user.role] || (isSupplierContext ? '/supplier' : '/dashboard')} replace />;
    }
  }

  // All checks passed, render children
  return <>{children}</>;
};