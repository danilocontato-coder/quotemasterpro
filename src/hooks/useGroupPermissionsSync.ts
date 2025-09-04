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
    updatePermissionProfile 
  } = useSupabasePermissions();
  const { groups } = useSupabaseUsers();
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
   * Criar perfil de permissão para um grupo específico (chamada manual)
   */
  const createPermissionProfileForGroup = useCallback(async (groupId: string) => {
    try {
      if (!client?.id) {
        toast.error('Cliente não identificado');
        return;
      }

      const group = groups.find(g => g.id === groupId);
      if (!group) {
        toast.error('Grupo não encontrado');
        return;
      }

      if (group.permission_profile_id) {
        toast.error('Este grupo já possui um perfil de permissão');
        return;
      }

      // Definir permissões padrão baseadas no nome do grupo
      const permissions: Record<string, any> = {};
      
      if (group.name === 'Administradores' || group.name.toLowerCase().includes('admin')) {
        // Admin tem todas as permissões
        ['quotes', 'products', 'suppliers', 'payments', 'communication', 'users', 'settings', 'reports'].forEach(module => {
          permissions[module] = { view: true, create: true, edit: true, delete: true };
        });
      } else if (group.name === 'Gestores' || group.name.toLowerCase().includes('gestor') || group.name.toLowerCase().includes('manager')) {
        // Gestores têm permissões amplas
        ['quotes', 'products', 'suppliers', 'payments', 'communication', 'reports'].forEach(module => {
          permissions[module] = { view: true, create: true, edit: true, delete: true };
        });
        permissions['users'] = { view: true, create: true, edit: true, delete: false };
        permissions['settings'] = { view: true, create: false, edit: true, delete: false };
      } else if (group.name === 'Colaboradores' || group.name.toLowerCase().includes('colaborador') || group.name.toLowerCase().includes('collaborator')) {
        // Colaboradores têm permissões básicas
        permissions['quotes'] = { view: true, create: true, edit: true, delete: false };
        permissions['products'] = { view: true, create: true, edit: true, delete: false };
        permissions['suppliers'] = { view: true, create: false, edit: false, delete: false };
        permissions['communication'] = { view: true, create: true, edit: false, delete: false };
        permissions['reports'] = { view: true, create: false, edit: false, delete: false };
      } else {
        // Grupo customizado - permissões mínimas (apenas visualizar)
        ['quotes', 'products', 'suppliers', 'payments', 'communication', 'users', 'settings', 'reports'].forEach(module => {
          permissions[module] = { view: true, create: false, edit: false, delete: false };
        });
      }

      // Criar perfil de permissão
      const newProfile = await createPermissionProfile({
        name: group.name,
        description: group.description || `Permissões para ${group.name}`,
        permissions,
        client_id: client.id
      });

      // Vincular o perfil ao grupo
      if (newProfile) {
        await supabase
          .from('user_groups')
          .update({ permission_profile_id: newProfile.id })
          .eq('id', group.id);
        
        toast.success(`Perfil de permissão criado para ${group.name}`);
        
        // Forçar atualização da página após um pequeno delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao criar perfil de permissão:', error);
      toast.error('Erro ao criar perfil de permissão');
    }
  }, [groups, createPermissionProfile, client]);

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
          }
        }
      }

      return effectivePermissions;
    } catch (error) {
      console.error('Erro ao obter permissões efetivas do usuário:', error);
      return {};
    }
  }, [permissionProfiles]);

  /**
   * Verificar se um usuário tem uma permissão específica
   */
  const userHasPermission = useCallback(async (userId: string, module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    const effectivePermissions = await getUserEffectivePermissions(userId);
    return effectivePermissions[module]?.[action] || false;
  }, [getUserEffectivePermissions]);

  /**
   * Atualizar permissões de um grupo específico
   */
  const updateGroupPermissions = useCallback(async (groupId: string, module: string, action: 'view' | 'create' | 'edit' | 'delete', value: boolean) => {
    try {
      const group = groups.find(g => g.id === groupId);
      if (!group?.permission_profile_id) return;

      const profile = permissionProfiles.find(p => p.id === group.permission_profile_id);
      if (!profile) return;

      const updatedPermissions = { ...profile.permissions };
      if (!updatedPermissions[module]) {
        updatedPermissions[module] = { view: false, create: false, edit: false, delete: false };
      }
      updatedPermissions[module][action] = value;

      await updatePermissionProfile(profile.id, {
        ...profile,
        permissions: updatedPermissions
      });

      toast.success('Permissões atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar permissões do grupo:', error);
      toast.error('Erro ao atualizar permissões');
    }
  }, [groups, permissionProfiles, updatePermissionProfile]);

  return {
    getUserEffectivePermissions,
    userHasPermission,
    updateGroupPermissions,
    createPermissionProfileForGroup,
    permissionMapping
  };
}