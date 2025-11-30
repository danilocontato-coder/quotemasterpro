import { useCallback } from 'react';
import { logger } from '@/utils/systemLogger';
import { UserRole } from './AuthCore';

export const getRoleBasedRoute = (
  role: UserRole,
  ctx?: { 
    supplierId?: string | null; 
    clientId?: string | null; 
    tenantType?: string | null;
    clientType?: string | null; // 'direct' | 'administradora' | 'condominio_vinculado'
  }
): string => {
  logger.navigation('getRoleBasedRoute', { role, ctx });

  // APENAS admin global acessa superadmin
  if (role === 'admin') {
    return '/admin/superadmin';
  }
  if (role === 'support') {
    return '/support';
  }

  // Supplier context wins over role when supplierId/tenantType indicate supplier
  const isSupplierContext = ctx?.tenantType === 'supplier' || !!ctx?.supplierId;
  if (isSupplierContext) {
    return '/supplier';
  }

  // Redirecionar baseado no tipo de cliente
  if (ctx?.clientType === 'condominio_vinculado') {
    return '/condominio';
  }
  
  if (ctx?.clientType === 'administradora') {
    return '/administradora/dashboard';
  }

  // Client/Manager direto (client_type = 'direct' ou null)
  switch (role) {
    case 'admin_cliente':
    case 'manager':
    case 'client':
    case 'collaborator':
      return '/dashboard';
    default:
      return '/dashboard';
  }
};

export const useAuthNavigation = () => {
  const navigateToRoleRoute = useCallback((role: UserRole, ctx?: any) => {
    const route = getRoleBasedRoute(role, ctx);
    window.location.href = route;
  }, []);

  return {
    getRoleBasedRoute,
    navigateToRoleRoute,
  };
};
