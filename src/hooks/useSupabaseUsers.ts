import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SupabaseUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'manager' | 'collaborator' | 'supplier';
  status: 'active' | 'inactive';
  avatar_url?: string;
  last_access?: string;
  created_at: string;
  updated_at: string;
  client_id?: string;
  supplier_id?: string;
  force_password_change: boolean;
  auth_user_id?: string;
  groups?: string[];
}

export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  permissions: string[];
  user_count: number;
  created_at: string;
  updated_at: string;
  is_system_group: boolean;
}

export function useSupabaseUsers() {
  const [users, setUsers] = useState<SupabaseUser[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentProfile, setCurrentProfile] = useState<{ id: string; client_id?: string | null; role?: string | null } | null>(null);
  const [currentAuthUserId, setCurrentAuthUserId] = useState<string | null>(null);

  // Load current auth user and profile
  useEffect(() => {
    const loadCurrentProfile = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const authUserId = authData.user?.id || null;
        setCurrentAuthUserId(authUserId);
        if (!authUserId) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, client_id, role')
          .eq('id', authUserId)
          .maybeSingle();
        if (profile) setCurrentProfile(profile);
      } catch (e) {
        console.error('Error loading current profile', e);
      }
    };
    loadCurrentProfile();
  }, []);

  // Fetch users from Supabase
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch group memberships for each user
      const usersWithGroups = await Promise.all(
        (data || []).map(async (user) => {
          const { data: memberships } = await supabase
            .from('user_group_memberships')
            .select('group_id, user_groups(name)')
            .eq('user_id', user.id);

          return {
            ...user,
            role: user.role as 'admin' | 'manager' | 'collaborator' | 'supplier',
            status: user.status as 'active' | 'inactive',
            groups: memberships?.map(m => m.user_groups?.name || '') || []
          };
        })
      );

      setUsers(usersWithGroups);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    }
  };

  // Fetch groups from Supabase
  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('user_groups')
        .select('*')
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Erro ao carregar grupos');
    }
  };

  // Create new user
  const createUser = async (userData: Omit<SupabaseUser, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const isAdmin = currentProfile?.role === 'admin';
      const effectiveClientId = userData.client_id ?? currentProfile?.client_id ?? null;

      if (!isAdmin && !effectiveClientId) {
        toast.error('Você não tem permissão para criar usuários sem um cliente associado.');
        throw new Error('RLS: client_id required for non-admin users');
      }

      const { data, error } = await supabase
        .from('users')
        .insert([{
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          role: userData.role,
          status: userData.status,
          client_id: effectiveClientId,
          supplier_id: userData.supplier_id,
          force_password_change: userData.force_password_change
        }])
        .select()
        .single();

      if (error) throw error;

      // Add to groups if specified
      if (userData.groups && userData.groups.length > 0) {
        const groupsToAdd = groups.filter(g => userData.groups?.includes(g.name));
        const membershipInserts = groupsToAdd.map(group => ({
          user_id: data.id,
          group_id: group.id
        }));
        
        if (membershipInserts.length > 0) {
          const { error: membershipError } = await supabase
            .from('user_group_memberships')
            .insert(membershipInserts);
          
          if (membershipError) {
            console.error('Error adding user to groups:', membershipError);
            // Don't fail the user creation if group assignment fails
          }
        }
      }

      // Create audit log - must use current auth user id due to RLS policy
      if (currentAuthUserId) {
        await supabase.from('audit_logs').insert({
          user_id: currentAuthUserId,
          action: 'CREATE',
          entity_type: 'users',
          entity_id: data.id,
          panel_type: isAdmin ? 'admin' : 'client',
          details: { 
            name: data.name, 
            email: data.email, 
            role: data.role,
            groups: userData.groups || []
          }
        });
      }

      toast.success('Usuário criado com sucesso');
      await fetchUsers();
      return data;
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error?.code === '42501') {
        toast.error('Permissão negada pelas políticas de acesso (RLS). Verifique o cliente selecionado e suas permissões.');
      } else {
        toast.error('Erro ao criar usuário: ' + (error?.message || 'Tente novamente'));
      }
      throw error;
    }
  };

  // Update user
  const updateUser = async (id: string, userData: Partial<SupabaseUser>) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          role: userData.role,
          status: userData.status,
          client_id: userData.client_id,
          supplier_id: userData.supplier_id,
          force_password_change: userData.force_password_change
        })
        .eq('id', id);

      if (error) throw error;

      // Update group memberships
      if (userData.groups !== undefined) {
        // Remove existing memberships
        await supabase
          .from('user_group_memberships')
          .delete()
          .eq('user_id', id);

        // Add new memberships
        if (userData.groups.length > 0) {
          const groupsToAdd = groups.filter(g => userData.groups?.includes(g.name));
          for (const group of groupsToAdd) {
            await supabase
              .from('user_group_memberships')
              .insert({ user_id: id, group_id: group.id });
          }
        }
      }

      toast.success('Usuário atualizado com sucesso');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário: ' + error.message);
      throw error;
    }
  };

  // Delete user
  const deleteUser = async (id: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Usuário excluído com sucesso');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir usuário: ' + error.message);
      throw error;
    }
  };

  // Create group
  const createGroup = async (groupData: Omit<UserGroup, 'id' | 'created_at' | 'updated_at' | 'user_count'>) => {
    try {
      const { data, error } = await supabase
        .from('user_groups')
        .insert([groupData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Grupo criado com sucesso');
      await fetchGroups();
      return data;
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast.error('Erro ao criar grupo: ' + error.message);
      throw error;
    }
  };

  // Update group
  const updateGroup = async (id: string, groupData: Partial<UserGroup>) => {
    try {
      const { error } = await supabase
        .from('user_groups')
        .update(groupData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Grupo atualizado com sucesso');
      await fetchGroups();
    } catch (error: any) {
      console.error('Error updating group:', error);
      toast.error('Erro ao atualizar grupo: ' + error.message);
      throw error;
    }
  };

  // Delete group
  const deleteGroup = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Grupo excluído com sucesso');
      await fetchGroups();
    } catch (error: any) {
      console.error('Error deleting group:', error);
      toast.error('Erro ao excluir grupo: ' + error.message);
      throw error;
    }
  };

  // Generate temporary password (memoized to prevent re-renders)
  const generateTemporaryPassword = useCallback(() => {
    return Math.random().toString(36).slice(-8).toUpperCase();
  }, []);

  // Reset password
  const resetPassword = async (userId: string) => {
    const newPassword = generateTemporaryPassword();
    // In a real implementation, you would need to integrate with Supabase Auth
    // For now, we'll just return the password and update the force_password_change flag
    try {
      await updateUser(userId, { force_password_change: true });
      return newPassword;
    } catch (error) {
      throw error;
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.phone && user.phone.includes(searchTerm))
  );

  // Set up realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('users-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchUsers();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_groups' },
        () => {
          fetchGroups();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_group_memberships' },
        () => {
          fetchUsers();
          fetchGroups();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchGroups()]);
      setLoading(false);
    };
    loadData();
  }, []);

  return {
    users: filteredUsers,
    groups,
    loading,
    searchTerm,
    setSearchTerm,
    createUser,
    updateUser,
    deleteUser,
    createGroup,
    updateGroup,
    deleteGroup,
    generateTemporaryPassword,
    resetPassword,
    fetchUsers,
    fetchGroups
  };
}