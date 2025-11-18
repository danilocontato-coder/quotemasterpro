import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Permission = 
  | 'quotes.create'
  | 'quotes.view_all'
  | 'quotes.approve'
  | 'quotes.delete'
  | 'suppliers.manage'
  | 'users.manage'
  | 'admin.access'
  | 'reports.view'
  | 'payments.process'
  | 'payments.approve'
  | 'contracts.manage'
  | 'ai_negotiation.use'
  | 'cost_centers.manage';

interface PermissionCheck {
  hasPermission: (permission: Permission) => boolean;
  isLoading: boolean;
  userRoles: string[];
}

/**
 * Hook seguro para verificar permissões
 * SEMPRE valida no backend via RLS
 * Frontend usa APENAS para UI (mostrar/esconder botões)
 * 
 * IMPORTANTE: Nunca confie em verificações client-side para segurança!
 * Este hook é APENAS para melhorar UX. A segurança real está em:
 * 1. RLS Policies no banco de dados
 * 2. Edge Functions para validações críticas
 * 3. Database functions com SECURITY DEFINER
 */
export const usePermissions = (): PermissionCheck => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return { roles: [] };
      
      // Buscar role via função SQL segura (evita exposição direta da tabela user_roles)
      const { data: userRole, error } = await supabase
        .rpc('get_user_role');
      
      if (error) {
        console.error('Error fetching role:', error);
        return { roles: [] };
      }
      
      // Se não retornou role da função segura, usar o role do contexto como fallback
      const roles = userRole ? [userRole] : (user?.role ? [user.role] : []);
      
      return { roles };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache 5 minutos
  });

  const hasPermission = (permission: Permission): boolean => {
    if (!data?.roles || data.roles.length === 0) return false;
    
    const userRoles = data.roles;
    
    // Admin e super_admin têm todas as permissões
    if (userRoles.includes('admin') || userRoles.includes('super_admin')) return true;
    
    // Mapeamento permission -> roles permitidas
    const permissionMap: Record<Permission, string[]> = {
      'quotes.create': ['admin', 'manager', 'collaborator', 'admin_cliente'],
      'quotes.view_all': ['admin', 'admin_cliente'],
      'quotes.approve': ['admin', 'manager', 'admin_cliente'],
      'quotes.delete': ['admin', 'admin_cliente'],
      'suppliers.manage': ['admin', 'admin_cliente'],
      'users.manage': ['admin', 'admin_cliente'],
      'admin.access': ['admin'],
      'reports.view': ['admin', 'manager', 'admin_cliente'],
      'payments.process': ['admin', 'admin_cliente'],
      'payments.approve': ['admin', 'admin_cliente'],
      'contracts.manage': ['admin', 'admin_cliente'],
      'ai_negotiation.use': ['admin', 'admin_cliente', 'manager'],
      'cost_centers.manage': ['admin', 'admin_cliente'],
    };
    
    const allowedRoles = permissionMap[permission] || [];
    return userRoles.some(role => allowedRoles.includes(role));
  };

  return {
    hasPermission,
    isLoading,
    userRoles: data?.roles || [],
  };
};
