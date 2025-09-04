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
      console.log('🔧 Iniciando criação de perfil para grupo:', groupId);
      
      if (!client?.id) {
        toast.error('Cliente não identificado');
        return false;
      }

      const group = groups.find(g => g.id === groupId);
      if (!group) {
        toast.error('Grupo não encontrado');
        return false;
      }

      console.log('📋 Grupo encontrado:', group.name, 'Permission Profile ID:', group.permission_profile_id);

      // Verificar se já tem perfil vinculado (verificação mais robusta)
      if (group.permission_profile_id) {
        const existingProfile = permissionProfiles.find(p => p.id === group.permission_profile_id);
        if (existingProfile) {
          console.log('❌ Grupo já possui perfil:', existingProfile);
          toast.error('Este grupo já possui um perfil de permissão configurado');
          return false;
        }
      }

      // Verificar se já existe um perfil com o mesmo nome (evitar duplicatas)
      const duplicateProfile = permissionProfiles.find(p => p.name === group.name && p.client_id === client.id);
      if (duplicateProfile) {
        console.log('❌ Perfil duplicado encontrado:', duplicateProfile);
        toast.error(`Já existe um perfil de permissão para o grupo "${group.name}"`);
        return false;
      }

      // Template padrão de permissões (todas desativadas para facilitar configuração)
      const getDefaultPermissionsTemplate = (isAdmin = false) => {
        const basePermissions = {
          quotes: { view: false, create: false, edit: false, delete: false },
          products: { view: false, create: false, edit: false, delete: false },
          suppliers: { view: false, create: false, edit: false, delete: false },
          payments: { view: false, create: false, edit: false, delete: false },
          communication: { view: false, create: false, edit: false, delete: false },
          reports: { view: false, create: false, edit: false, delete: false },
          users: { view: false, create: false, edit: false, delete: false },
          settings: { view: false, create: false, edit: false, delete: false }
        };

        // Apenas admin tem tudo ativado por padrão
        if (isAdmin) {
          Object.keys(basePermissions).forEach(module => {
            basePermissions[module] = { view: true, create: true, edit: true, delete: true };
          });
        }

        return basePermissions;
      };

      // Definir permissões baseadas no tipo de grupo
      const groupName = group.name.toLowerCase();
      const isAdmin = groupName.includes('admin');
      const permissions = getDefaultPermissionsTemplate(isAdmin);

      console.log('🎯 Permissões definidas:', permissions);

      // Criar perfil de permissão
      console.log('📤 Criando perfil de permissão...');
      const newProfile = await createPermissionProfile({
        name: group.name,
        description: group.description || `Permissões para ${group.name}`,
        permissions,
        client_id: client.id
      });

      console.log('✅ Perfil criado:', newProfile);

      // Vincular o perfil ao grupo
      if (newProfile) {
        console.log('🔗 Vinculando perfil ao grupo...');
        const { error: linkError } = await supabase
          .from('user_groups')
          .update({ permission_profile_id: newProfile.id })
          .eq('id', group.id);

        if (linkError) {
          console.error('❌ Erro ao vincular perfil ao grupo:', linkError);
          throw linkError;
        }

        console.log('🔄 Atualizando interface...');
        // IMPORTANTE: Atualizar os dados na interface com delay para garantir consistência
        await Promise.all([
          refreshProfiles(),
          fetchGroups()
        ]);

        // Aguardar um pouco para garantir que os dados foram atualizados
        setTimeout(async () => {
          await Promise.all([
            refreshProfiles(),
            fetchGroups()
          ]);
          console.log('✨ Interface atualizada com delay');
        }, 1000);
        
        toast.success(`Permissões criadas para ${group.name}!`);
        console.log('🎉 Processo concluído com sucesso');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('💥 Erro ao criar perfil de permissão:', error);
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
    if (!group?.permission_profile_id) {
      console.log('❌ Grupo sem permission_profile_id:', groupId, group?.name);
      return null;
    }
    
    const profile = permissionProfiles.find(p => p.id === group.permission_profile_id);
    console.log('🔍 Buscando perfil para grupo:', {
      groupId,
      groupName: group?.name,
      permissionProfileId: group.permission_profile_id,
      profileFound: !!profile,
      totalProfiles: permissionProfiles.length,
      profileIds: permissionProfiles.map(p => p.id)
    });
    
    return profile || null;
  }, [groups, permissionProfiles]);

  return {
    updateGroupPermissions,
    createPermissionProfileForGroup,
    hasPermissionProfile,
    getGroupPermissionProfile,
    permissionMapping
  };
}