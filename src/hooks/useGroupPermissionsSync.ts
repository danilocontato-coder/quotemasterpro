import { useMemo, useCallback } from 'react';
import { useSupabasePermissions } from './useSupabasePermissions';
import { useSupabaseUsers } from './useSupabaseUsers';
import { useSupabaseCurrentClient } from './useSupabaseCurrentClient';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook para gerenciar permissões de grupos - TOTALMENTE MANUAL
 * Sem automação para evitar loops infinitos
 */
export function useGroupPermissionsSync() {
  const { 
    permissionProfiles, 
    createPermissionProfile, 
    updatePermissionProfile,
    refreshProfiles 
  } = useSupabasePermissions();
  const { groups, fetchGroups } = useSupabaseUsers();
  const { client } = useSupabaseCurrentClient();

  // Mapeamento de permissões (somente para referência)
  const permissionMapping = useMemo(() => ({
    'quotes': 'quotes',
    'products': 'products',
    'suppliers': 'suppliers',
    'payments': 'payments',
    'communication': 'communication',
    'users': 'users',
    'settings': 'settings',
    'reports': 'reports'
  }), []);

  /**
   * Criar perfil de permissão para um grupo específico - MANUAL
   */
  const createPermissionProfileForGroup = useCallback(async (groupId: string) => {
    try {
      if (!client?.id) {
        toast.error('Cliente não identificado');
        return false;
      }

      const group = groups.find(g => g.id === groupId);
      if (!group) {
        toast.error('Grupo não encontrado');
        return false;
      }

      // Verificar se já tem perfil vinculado
      if (group.permission_profile_id) {
        const existingProfile = permissionProfiles.find(p => p.id === group.permission_profile_id);
        if (existingProfile) {
          toast.error('Este grupo já possui um perfil de permissão');
          return false;
        }
      }

      // Definir permissões padrão baseadas no nome do grupo
      const permissions: Record<string, any> = {};
      const groupName = group.name.toLowerCase();
      
      if (groupName.includes('admin')) {
        // Admin tem todas as permissões
        ['quotes', 'products', 'suppliers', 'payments', 'communication', 'users', 'settings', 'reports'].forEach(module => {
          permissions[module] = { view: true, create: true, edit: true, delete: true };
        });
      } else if (groupName.includes('gestor') || groupName.includes('manager')) {
        // Gestores têm permissões amplas
        permissions['quotes'] = { view: true, create: true, edit: true, delete: true };
        permissions['products'] = { view: true, create: true, edit: true, delete: true };
        permissions['suppliers'] = { view: true, create: true, edit: true, delete: false };
        permissions['payments'] = { view: true, create: true, edit: true, delete: false };
        permissions['communication'] = { view: true, create: true, edit: true, delete: false };
        permissions['reports'] = { view: true, create: true, edit: false, delete: false };
        permissions['users'] = { view: true, create: true, edit: true, delete: false };
        permissions['settings'] = { view: true, create: false, edit: true, delete: false };
      } else if (groupName.includes('colaborador') || groupName.includes('collaborator')) {
        // Colaboradores têm permissões básicas
        permissions['quotes'] = { view: true, create: true, edit: true, delete: false };
        permissions['products'] = { view: true, create: true, edit: true, delete: false };
        permissions['suppliers'] = { view: true, create: false, edit: false, delete: false };
        permissions['communication'] = { view: true, create: true, edit: false, delete: false };
        permissions['payments'] = { view: true, create: false, edit: false, delete: false };
        permissions['reports'] = { view: true, create: false, edit: false, delete: false };
        permissions['users'] = { view: false, create: false, edit: false, delete: false };
        permissions['settings'] = { view: false, create: false, edit: false, delete: false };
      } else {
        // Grupo customizado - permissões mínimas
        permissions['quotes'] = { view: true, create: false, edit: false, delete: false };
        permissions['products'] = { view: true, create: false, edit: false, delete: false };
        permissions['suppliers'] = { view: true, create: false, edit: false, delete: false };
        permissions['communication'] = { view: true, create: false, edit: false, delete: false };
        permissions['payments'] = { view: false, create: false, edit: false, delete: false };
        permissions['reports'] = { view: false, create: false, edit: false, delete: false };
        permissions['users'] = { view: false, create: false, edit: false, delete: false };
        permissions['settings'] = { view: false, create: false, edit: false, delete: false };
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
        
        // IMPORTANTE: Atualizar os dados na interface
        await Promise.all([
          refreshProfiles(),  // Atualizar perfis de permissão
          fetchGroups()       // Atualizar grupos
        ]);
        
        toast.success(`Permissões criadas para ${group.name}!`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao criar perfil de permissão:', error);
      toast.error('Erro ao criar perfil de permissão');
      return false;
    }
  }, [groups, createPermissionProfile, client, permissionProfiles, refreshProfiles, fetchGroups]);

  /**
   * Atualizar permissões de um grupo específico
   */
  const updateGroupPermissions = useCallback(async (groupId: string, module: string, action: 'view' | 'create' | 'edit' | 'delete', value: boolean) => {
    try {
      const group = groups.find(g => g.id === groupId);
      if (!group?.permission_profile_id) {
        toast.error('Grupo não possui perfil de permissão vinculado');
        return false;
      }

      const profile = permissionProfiles.find(p => p.id === group.permission_profile_id);
      if (!profile) {
        toast.error('Perfil de permissão não encontrado');
        return false;
      }

      const updatedPermissions = { ...profile.permissions };
      if (!updatedPermissions[module]) {
        updatedPermissions[module] = { view: false, create: false, edit: false, delete: false };
      }
      updatedPermissions[module][action] = value;

      await updatePermissionProfile(profile.id, {
        ...profile,
        permissions: updatedPermissions
      });

      // Atualizar dados na interface
      await refreshProfiles();

      toast.success('Permissão atualizada!');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar permissões do grupo:', error);
      toast.error('Erro ao atualizar permissões');
      return false;
    }
  }, [groups, permissionProfiles, updatePermissionProfile, refreshProfiles]);

  /**
   * Verificar se um grupo tem perfil de permissão
   */
  const hasPermissionProfile = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group?.permission_profile_id) return false;
    return permissionProfiles.some(p => p.id === group.permission_profile_id);
  }, [groups, permissionProfiles]);

  /**
   * Obter perfil de permissão de um grupo
   */
  const getGroupPermissionProfile = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group?.permission_profile_id) return null;
    return permissionProfiles.find(p => p.id === group.permission_profile_id) || null;
  }, [groups, permissionProfiles]);

  return {
    updateGroupPermissions,
    createPermissionProfileForGroup,
    hasPermissionProfile,
    getGroupPermissionProfile,
    permissionMapping
  };
}