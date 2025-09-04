import { useEffect, useMemo, useCallback } from 'react';
import { useSupabasePermissions } from './useSupabasePermissions';
import { useSupabaseUsers } from './useSupabaseUsers';
import { useSupabaseCurrentClient } from './useSupabaseCurrentClient';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook para sincronizar grupos de usuários com o sistema de permissões
 * Garante que as permissões sejam consistentes entre os dois sistemas
 */
export function useGroupPermissionsSync() {
  const { 
    permissionProfiles, 
    createPermissionProfile, 
    updatePermissionProfile,
    deletePermissionProfile 
  } = useSupabasePermissions();
  const { groups, updateGroup } = useSupabaseUsers();
  const { client } = useSupabaseCurrentClient();

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

  /**
   * Sincronizar grupo com perfil de permissão
   */
  const syncGroupWithPermissionProfile = useCallback(async (group: any) => {
    try {
      // Converter permissões do grupo para formato do perfil de permissão
      const permissions: Record<string, any> = {};
      
      group.permissions.forEach((permission: string) => {
        const moduleKey = permissionMapping[permission as keyof typeof permissionMapping];
        if (moduleKey) {
          if (!permissions[moduleKey]) {
            permissions[moduleKey] = { view: false, create: false, edit: false, delete: false };
          }

          if (permission === '*') {
            permissions[moduleKey] = { view: true, create: true, edit: true, delete: true };
          } else if (permission.includes('.')) {
            const [, action] = permission.split('.');
            const actionKey = action === 'approve' || action === 'respond' || action === 'manage' 
              ? 'edit' : action;
            
            if (['view', 'create', 'edit', 'delete'].includes(actionKey)) {
              permissions[moduleKey][actionKey] = true;
            }
          } else {
            permissions[moduleKey].view = true;
            // Para grupos específicos, conceder permissões adicionais
            if (group.name === 'Administradores') {
              permissions[moduleKey] = { view: true, create: true, edit: true, delete: true };
            } else if (group.name === 'Gestores') {
              permissions[moduleKey].create = true;
              permissions[moduleKey].edit = true;
            } else if (group.name === 'Colaboradores') {
              if (['quotes', 'products', 'suppliers'].includes(moduleKey)) {
                permissions[moduleKey].create = true;
                permissions[moduleKey].edit = true;
              }
            }
          }
        }
      });

      // Verificar se já existe um perfil de permissão para este grupo
      const existingProfile = permissionProfiles.find(p => p.name === `Grupo: ${group.name}`);
      
      if (existingProfile) {
        // Atualizar o perfil existente
        await updatePermissionProfile(existingProfile.id, {
          name: `Grupo: ${group.name}`,
          description: `Perfil de permissões do grupo ${group.name}`,
          permissions
        });
      } else {
        // Criar novo perfil de permissão
        if (!client?.id) {
          console.warn('Sem client_id disponível para criar permission_profile; pulando criação');
          return;
        }
        const newProfile = await createPermissionProfile({
          name: `Grupo: ${group.name}`,
          description: `Perfil de permissões do grupo ${group.name}`,
          permissions,
          client_id: client.id
        });

        // Associar o perfil ao grupo via update direto do Supabase
        if (newProfile) {
          const { error } = await supabase
            .from('user_groups')
            .update({ permission_profile_id: newProfile.id })
            .eq('id', group.id);
          
          if (error) {
            console.error('Erro ao associar perfil ao grupo:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar grupo com perfil de permissão:', error);
    }
  }, [permissionProfiles, createPermissionProfile, updatePermissionProfile, updateGroup, permissionMapping]);

  /**
   * Sincronizar perfil de permissão com grupo
   */
  const syncPermissionProfileWithGroup = useCallback(async (profile: any) => {
    try {
      // Encontrar grupo associado
      const associatedGroup = groups.find(g => g.permission_profile_id === profile.id);
      if (!associatedGroup) return;

      // Converter permissões do perfil para formato do grupo
      const groupPermissions: string[] = [];
      
      Object.entries(profile.permissions).forEach(([module, modulePermissions]: [string, any]) => {
        const { view, create, edit, delete: del } = modulePermissions;
        
        // Se tem todas as permissões, adicionar permissão geral
        if (view && create && edit && del) {
          groupPermissions.push(`${module}.*`);
        } else {
          // Adicionar permissões específicas
          if (view) groupPermissions.push(`${module}.view`);
          if (create) groupPermissions.push(`${module}.create`);
          if (edit) groupPermissions.push(`${module}.edit`);
          if (del) groupPermissions.push(`${module}.delete`);
        }
      });

      // Atualizar o grupo via update direto do Supabase
      const { error } = await supabase
        .from('user_groups')
        .update({ permissions: groupPermissions })
        .eq('id', associatedGroup.id);
      
      if (error) {
        console.error('Erro ao atualizar permissões do grupo:', error);
      }
    } catch (error) {
      console.error('Erro ao sincronizar perfil de permissão com grupo:', error);
    }
  }, [groups, updateGroup]);

  // Sincronizar quando grupos mudarem
  useEffect(() => {
    groups.forEach(group => {
      if (!group.is_system_group) { // Não sincronizar grupos do sistema
        syncGroupWithPermissionProfile(group);
      }
    });
  }, [groups, syncGroupWithPermissionProfile]);

  // Sincronizar quando perfis de permissão mudarem
  useEffect(() => {
    permissionProfiles.forEach(profile => {
      if (profile.name.startsWith('Grupo:')) {
        syncPermissionProfileWithGroup(profile);
      }
    });
  }, [permissionProfiles, syncPermissionProfileWithGroup]);

  /**
   * Obter permissões efetivas para um usuário baseado em seus grupos
   */
  const getUserEffectivePermissions = useCallback(async (userId: string) => {
    try {
      // Buscar grupos do usuário
      const { data: memberships } = await supabase
        .from('user_group_memberships')
        .select(`
          group_id,
          user_groups(
            id,
            name,
            permissions,
            permission_profile_id
          )
        `)
        .eq('user_id', userId);

      const effectivePermissions: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }> = {};

      // Combinar permissões de todos os grupos do usuário
      if (memberships) {
        for (const membership of memberships) {
          const group = (membership as any).user_groups;
          if (!group) continue;

          // Se o grupo tem um perfil de permissão associado, usar as permissões do perfil
          if (group.permission_profile_id) {
            const profile = permissionProfiles.find(p => p.id === group.permission_profile_id);
            if (profile) {
              Object.entries(profile.permissions).forEach(([module, modulePermissions]: [string, any]) => {
                if (!effectivePermissions[module]) {
                  effectivePermissions[module] = { view: false, create: false, edit: false, delete: false };
                }
                
                // Aplicar OR lógico para combinar permissões
                effectivePermissions[module].view = effectivePermissions[module].view || modulePermissions.view;
                effectivePermissions[module].create = effectivePermissions[module].create || modulePermissions.create;
                effectivePermissions[module].edit = effectivePermissions[module].edit || modulePermissions.edit;
                effectivePermissions[module].delete = effectivePermissions[module].delete || modulePermissions.delete;
              });
            }
          } else {
            // Usar permissões do grupo diretamente
            group.permissions?.forEach((permission: string) => {
              const moduleKey = permissionMapping[permission as keyof typeof permissionMapping];
              if (moduleKey) {
                if (!effectivePermissions[moduleKey]) {
                  effectivePermissions[moduleKey] = { view: false, create: false, edit: false, delete: false };
                }

                if (permission === '*') {
                  effectivePermissions[moduleKey] = { view: true, create: true, edit: true, delete: true };
                } else if (permission.includes('.')) {
                  const [, action] = permission.split('.');
                  const actionKey = action === 'approve' || action === 'respond' || action === 'manage' 
                    ? 'edit' : action;
                  
                  if (['view', 'create', 'edit', 'delete'].includes(actionKey)) {
                    effectivePermissions[moduleKey][actionKey as keyof typeof effectivePermissions[typeof moduleKey]] = true;
                  }
                }
              }
            });
          }
        }
      }

      return effectivePermissions;
    } catch (error) {
      console.error('Erro ao obter permissões efetivas do usuário:', error);
      return {};
    }
  }, [permissionProfiles, permissionMapping]);

  /**
   * Verificar se um usuário tem uma permissão específica
   */
  const userHasPermission = useCallback(async (userId: string, module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    const effectivePermissions = await getUserEffectivePermissions(userId);
    return effectivePermissions[module]?.[action] || false;
  }, [getUserEffectivePermissions]);

  /**
   * Forçar sincronização manual de um grupo específico
   */
  const forceSyncGroup = useCallback(async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      await syncGroupWithPermissionProfile(group);
      toast.success('Grupo sincronizado com sucesso!');
    }
  }, [groups, syncGroupWithPermissionProfile]);

  /**
   * Forçar sincronização manual de um perfil de permissão específico
   */
  const forceSyncPermissionProfile = useCallback(async (profileId: string) => {
    const profile = permissionProfiles.find(p => p.id === profileId);
    if (profile) {
      await syncPermissionProfileWithGroup(profile);
      toast.success('Perfil de permissão sincronizado com sucesso!');
    }
  }, [permissionProfiles, syncPermissionProfileWithGroup]);

  return {
    getUserEffectivePermissions,
    userHasPermission,
    permissionMapping,
    syncGroupWithPermissionProfile,
    syncPermissionProfileWithGroup,
    forceSyncGroup,
    forceSyncPermissionProfile
  };
}