import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PermissionProfile {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, Record<string, boolean>>;
  active: boolean;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
}

export function useSupabasePermissions() {
  const [permissionProfiles, setPermissionProfiles] = useState<PermissionProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPermissionProfiles = async () => {
    try {
      setLoading(true);
      
      // Get current user's client_id to filter profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      console.log('🔍 DEBUG fetchPermissionProfiles:', {
        userId: (await supabase.auth.getUser()).data.user?.id,
        clientId: profile?.client_id
      });

      const { data, error } = await supabase
        .from('permission_profiles')
        .select('*')
        .eq('active', true)
        .eq('client_id', profile?.client_id)
        .order('name');

      console.log('📋 DEBUG permission_profiles result:', {
        profilesCount: data?.length || 0,
        profiles: data?.map(p => ({ id: p.id, name: p.name })),
        error: error?.message
      });

      if (error) throw error;
      
      // Convert Json to our typed structure
      const typedData = (data || []).map(profile => ({
        ...profile,
        permissions: profile.permissions as Record<string, Record<string, boolean>>
      }));
      
      setPermissionProfiles(typedData);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Erro ao carregar perfis",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPermissionProfile = async (profileData: {
    name: string;
    description?: string;
    permissions: Record<string, Record<string, boolean>>;
    client_id?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('permission_profiles')
        .insert([{
          name: profileData.name,
          description: profileData.description,
          permissions: profileData.permissions,
          client_id: profileData.client_id || null,
          active: true
        }])
        .select()
        .single();

      if (error) throw error;

      // Convert permissions to typed structure
      const typedData = {
        ...data,
        permissions: data.permissions as Record<string, Record<string, boolean>>
      };

      setPermissionProfiles(prev => [...prev, typedData]);
      
      // Log audit
      await supabase.from('audit_logs').insert([{
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'CREATE_PERMISSION_PROFILE',
        entity_type: 'permission_profiles',
        entity_id: data.id,
        details: { name: profileData.name }
      }]);

      toast({
        title: "Perfil criado",
        description: "Novo perfil de permissões criado com sucesso.",
      });

      return data;
    } catch (err: any) {
      toast({
        title: "Erro ao criar perfil",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  const updatePermissionProfile = async (id: string, updates: Partial<PermissionProfile>) => {
    try {
      const { data, error } = await supabase
        .from('permission_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Convert permissions to typed structure
      const typedData = {
        ...data,
        permissions: data.permissions as Record<string, Record<string, boolean>>
      };

      setPermissionProfiles(prev => 
        prev.map(profile => profile.id === id ? { ...profile, ...typedData } : profile)
      );

      // Log audit
      await supabase.from('audit_logs').insert([{
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'UPDATE_PERMISSION_PROFILE',
        entity_type: 'permission_profiles',
        entity_id: id,
        details: updates
      }]);

      toast({
        title: "Perfil atualizado",
        description: "Permissões atualizadas com sucesso.",
      });

      return data;
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  const deletePermissionProfile = async (id: string) => {
    try {
      const { error } = await supabase
        .from('permission_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPermissionProfiles(prev => prev.filter(profile => profile.id !== id));
      
      // Log audit
      await supabase.from('audit_logs').insert([{
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'DELETE_PERMISSION_PROFILE',
        entity_type: 'permission_profiles',
        entity_id: id,
        details: {}
      }]);

      toast({
        title: "Perfil excluído",
        description: "Perfil de permissões removido com sucesso.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao excluir perfil",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  const updatePermission = async (
    profileId: string, 
    module: string, 
    action: keyof Permission, 
    value: boolean
  ) => {
    try {
      const profile = permissionProfiles.find(p => p.id === profileId);
      if (!profile) throw new Error('Perfil não encontrado');

      const updatedPermissions = {
        ...profile.permissions,
        [module]: {
          ...profile.permissions[module],
          [action]: value
        }
      };

      await updatePermissionProfile(profileId, { permissions: updatedPermissions });
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar permissão",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  const hasPermission = (profileId: string, module: string, action: keyof Permission): boolean => {
    const profile = permissionProfiles.find(p => p.id === profileId);
    return profile?.permissions?.[module]?.[action] || false;
  };

  const getProfilePermissions = (profileId: string) => {
    const profile = permissionProfiles.find(p => p.id === profileId);
    return profile?.permissions || {};
  };

  // Convert permission profiles to roles format
  const roles: Role[] = permissionProfiles.map(profile => ({
    id: profile.id,
    name: profile.name,
    description: profile.description || '',
    userCount: 0 // TODO: Get actual user count from users table
  }));

  // Create permissions object in the format expected by the UI
  const permissions = permissionProfiles.reduce((acc, profile) => {
    acc[profile.id] = profile.permissions;
    return acc;
  }, {} as Record<string, Record<string, Record<string, boolean>>>);

  useEffect(() => {
    fetchPermissionProfiles();
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('permission_profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'permission_profiles'
        },
        (payload) => {
          console.log('Permission profiles change:', payload);
          fetchPermissionProfiles(); // Refresh data on changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    permissionProfiles,
    roles,
    permissions,
    loading,
    error,
    createPermissionProfile,
    updatePermissionProfile,
    deletePermissionProfile,
    updatePermission,
    hasPermission,
    getProfilePermissions,
    refreshProfiles: fetchPermissionProfiles
  };
}