import { useCallback } from 'react';
import { logger } from '@/utils/systemLogger';
import { UserRole } from './AuthCore';

export const getRoleBasedRoute = (
  role: UserRole,
  ctx?: { supplierId?: string | null; clientId?: string | null; tenantType?: string | null }
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

  // Client/Manager context (inclui admin_cliente)
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
