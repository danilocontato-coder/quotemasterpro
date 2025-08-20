import { useEffect, useMemo } from 'react';
import { usePermissions } from './usePermissions';
import { useUserGroups } from './useUsersAndGroups';

/**
 * Hook para sincronizar grupos de usuários com o sistema de permissões
 * Garante que as permissões sejam consistentes entre os dois sistemas
 */
export function useGroupPermissionsSync() {
  const { permissions, updatePermission, initializeProfilePermissions } = usePermissions();
  const { groups } = useUserGroups();

  // Mapeamento de permissões de grupo para módulos do sistema de permissões
  const permissionMapping = useMemo(() => ({
    'quotes': 'quotes',
    'quotes.view': 'quotes',
    'quotes.create': 'quotes', 
    'quotes.edit': 'quotes',
    'quotes.delete': 'quotes',
    'quotes.approve': 'quotes',
    'quotes.respond': 'quotes',
    
    'products': 'products',
    'products.view': 'products',
    'products.create': 'products',
    'products.edit': 'products',
    'products.delete': 'products',
    'products.manage': 'products',
    'products.research': 'products',
    
    'suppliers': 'suppliers',
    'suppliers.view': 'suppliers',
    'suppliers.create': 'suppliers',
    'suppliers.edit': 'suppliers',
    'suppliers.delete': 'suppliers',
    'suppliers.manage': 'suppliers',
    'suppliers.negotiate': 'suppliers',
    
    'payments': 'payments',
    'payments.view': 'payments',
    'payments.create': 'payments',
    'payments.edit': 'payments',
    'payments.approve': 'payments',
    
    'communication': 'communication',
    'communication.view': 'communication',
    'communication.create': 'communication',
    'communication.edit': 'communication',
    
    'users': 'users',
    'users.view': 'users',
    'users.create': 'users',
    'users.edit': 'users',
    'users.delete': 'users',
    
    'settings': 'settings',
    'settings.view': 'settings',
    'settings.edit': 'settings',
    
    'reports': 'reports',
    'reports.view': 'reports',
    'reports.create': 'reports',
    'reports.export': 'reports',
    'reports.financial': 'reports',
    
    'budget.manage': 'reports', // Budget management via reports
    'profile.edit': 'settings',
    'proposals.view': 'quotes'
  }), []);

  // Sincronizar permissões dos grupos com o sistema de permissões
  useEffect(() => {
    groups.forEach(group => {
      // Inicializar permissões para o grupo se não existir
      if (!permissions[group.id]) {
        initializeProfilePermissions(group.id);
      }

      // Atualizar permissões baseado nas permissões do grupo
      group.permissions.forEach(permission => {
        const moduleKey = permissionMapping[permission as keyof typeof permissionMapping];
        if (moduleKey) {
          // Determinar ações baseado na permissão específica
          if (permission === '*') {
            // Permissão total - conceder todas as ações
            updatePermission(group.id, moduleKey, 'view', true);
            updatePermission(group.id, moduleKey, 'create', true);
            updatePermission(group.id, moduleKey, 'edit', true);
            updatePermission(group.id, moduleKey, 'delete', true);
          } else if (permission.includes('.')) {
            // Permissão específica (ex: quotes.view)
            const [, action] = permission.split('.');
            const actionKey = action === 'approve' || action === 'respond' || action === 'manage' 
              ? 'edit' // Mapear ações especiais para edit
              : action as 'view' | 'create' | 'edit' | 'delete';
            
            if (['view', 'create', 'edit', 'delete'].includes(actionKey)) {
              updatePermission(group.id, moduleKey, actionKey, true);
            }
          } else {
            // Permissão de módulo geral - conceder view por padrão
            updatePermission(group.id, moduleKey, 'view', true);
            
            // Para grupos específicos, conceder permissões adicionais
            if (group.name === 'Administradores') {
              updatePermission(group.id, moduleKey, 'create', true);
              updatePermission(group.id, moduleKey, 'edit', true);
              updatePermission(group.id, moduleKey, 'delete', true);
            } else if (group.name === 'Gestores') {
              updatePermission(group.id, moduleKey, 'create', true);
              updatePermission(group.id, moduleKey, 'edit', true);
            } else if (group.name === 'Colaboradores') {
              if (['quotes', 'products', 'suppliers'].includes(moduleKey)) {
                updatePermission(group.id, moduleKey, 'create', true);
                updatePermission(group.id, moduleKey, 'edit', true);
              }
            }
          }
        }
      });
    });
  }, [groups, permissions, permissionMapping, updatePermission, initializeProfilePermissions]);

  /**
   * Obter permissões efetivas para um usuário baseado em seus grupos
   */
  const getUserEffectivePermissions = (userGroupIds: string[]) => {
    const effectivePermissions: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }> = {};

    // Combinar permissões de todos os grupos do usuário
    userGroupIds.forEach(groupId => {
      const groupPermissions = permissions[groupId];
      if (groupPermissions) {
        Object.entries(groupPermissions).forEach(([module, modulePermissions]) => {
          if (!effectivePermissions[module]) {
            effectivePermissions[module] = { view: false, create: false, edit: false, delete: false };
          }
          
          // Aplicar OR lógico para combinar permissões (se qualquer grupo permite, usuário pode)
          effectivePermissions[module].view = effectivePermissions[module].view || modulePermissions.view;
          effectivePermissions[module].create = effectivePermissions[module].create || modulePermissions.create;
          effectivePermissions[module].edit = effectivePermissions[module].edit || modulePermissions.edit;
          effectivePermissions[module].delete = effectivePermissions[module].delete || modulePermissions.delete;
        });
      }
    });

    return effectivePermissions;
  };

  /**
   * Verificar se um usuário tem uma permissão específica
   */
  const userHasPermission = (userGroupIds: string[], module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    const effectivePermissions = getUserEffectivePermissions(userGroupIds);
    return effectivePermissions[module]?.[action] || false;
  };

  return {
    getUserEffectivePermissions,
    userHasPermission,
    permissionMapping
  };
}