import { useEffect, useMemo, useCallback, useRef } from 'react';
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

  // Evita loops de sincronização e atualizações redundantes
  const SYNC_COOLDOWN_MS = 5000;
  const recentlySyncedGroups = useRef<Record<string, number>>({});

  const shouldSkipGroupSync = (groupId: string) => {
    const now = Date.now();
    const last = recentlySyncedGroups.current[groupId] || 0;
    if (now - last < SYNC_COOLDOWN_MS) return true;
    recentlySyncedGroups.current[groupId] = now;
    return false;
  };

  const arePermissionsEqual = (a: Record<string, any>, b: Record<string, any>) => {
    try {
      const normalize = (obj: Record<string, any>) => {
        const sortedKeys = Object.keys(obj || {}).sort();
        const out: Record<string, any> = {};
        for (const k of sortedKeys) {
          const v = obj[k] || {};
          out[k] = {
            view: !!v.view,
            create: !!v.create,
            edit: !!v.edit,
            delete: !!v.delete,
          };
        }
        return out;
      };
      return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
    } catch {
      return false;
    }
  };

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
      if (!group || group.is_system_group) return;
      if (shouldSkipGroupSync(group.id)) return;

      // Converter permissões do grupo para formato do perfil de permissão
      const permissions: Record<string, any> = {};
      group.permissions?.forEach((permission: string) => {
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

      // Se o grupo já estiver vinculado a um perfil por ID, atualizar esse perfil e retornar
      if (group.permission_profile_id) {
        const linkedProfile = permissionProfiles.find(p => p.id === group.permission_profile_id);
        if (linkedProfile) {
          if (!arePermissionsEqual(linkedProfile.permissions, permissions)) {
            await updatePermissionProfile(linkedProfile.id, {
              name: linkedProfile.name,
              description: linkedProfile.description ?? `Perfil de permissões do grupo ${group.name}`,
              permissions
            });
          }
          return;
        }
      }

      // Verificar se já existe um perfil de permissão para este grupo (por nome)
      const existingProfile = permissionProfiles.find(p => p.name === `Grupo: ${group.name}`);
      if (existingProfile) {
        // Evitar update redundante
        if (arePermissionsEqual(existingProfile.permissions, permissions)) {
          return;
        }
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
  }, [permissionProfiles, createPermissionProfile, updatePermissionProfile, permissionMapping, client]);


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

  // Garantir que todo perfil de permissão tenha um grupo correspondente automaticamente
  useEffect(() => {
    const ensureGroups = async () => {
      for (const profile of permissionProfiles) {
        try {
          if (!profile?.id) continue;
          if (shouldSkipGroupSync(profile.id)) continue;

          // Já existe grupo vinculado por ID?
          const linked = groups.find(g => g.permission_profile_id === profile.id);
          if (linked) continue;

          // Tentar vincular por nome existente
          const targetName = (profile.name || '').replace(/^Grupo:\s*/, '').trim();
          const existingByName = groups.find(g => g.name === targetName || g.name === profile.name);
          if (existingByName && !existingByName.permission_profile_id) {
            await supabase
              .from('user_groups')
              .update({ permission_profile_id: profile.id })
              .eq('id', existingByName.id);
            continue;
          }

          // Converter permissões do perfil para lista de strings do grupo
          const groupPermissions: string[] = [];
          Object.entries(profile.permissions || {}).forEach(([module, perms]: [string, any]) => {
            const v = (perms || {}) as { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
            if (v.view && v.create && v.edit && v.delete) {
              groupPermissions.push(`${module}.*`);
            } else {
              if (v.view) groupPermissions.push(`${module}.view`);
              if (v.create) groupPermissions.push(`${module}.create`);
              if (v.edit) groupPermissions.push(`${module}.edit`);
              if (v.delete) groupPermissions.push(`${module}.delete`);
            }
          });

          // Criar grupo automático vinculado ao perfil
          await supabase.from('user_groups').insert({
            name: targetName || profile.name,
            description: `Grupo automático para perfil ${profile.name}`,
            permission_profile_id: profile.id,
            permissions: groupPermissions,
            is_system_group: false,
          });
        } catch (e) {
          console.error('Erro ao garantir grupo para perfil', profile?.name, e);
        }
      }
    };

    if (permissionProfiles?.length) {
      ensureGroups();
    }
  }, [permissionProfiles, groups]);

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