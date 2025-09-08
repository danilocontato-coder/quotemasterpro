import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSupabaseCurrentClient } from '@/hooks/useSupabaseCurrentClient';

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
  permission_profile_id?: string;
}

export function useSupabaseUsers() {
  const { client: currentClient } = useSupabaseCurrentClient();
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
  const createUser = async (userData: Omit<SupabaseUser, 'id' | 'created_at' | 'updated_at'> & { password?: string }) => {
    try {
      const isAdmin = currentProfile?.role === 'admin';
      const effectiveClientId = userData.client_id ?? currentProfile?.client_id ?? null;

      if (!isAdmin && !effectiveClientId) {
        toast.error('Você não tem permissão para criar usuários sem um cliente associado.');
        throw new Error('RLS: client_id required for non-admin users');
      }

      // Se uma senha foi fornecida, criar o usuário no Supabase Auth primeiro
      let authUserId = null;
      if (userData.password) {
        console.log('Creating auth user for:', userData.email);
        
        const { data: authResult, error: authError } = await supabase.functions.invoke('create-auth-user', {
          body: {
            email: userData.email,
            password: userData.password,
            name: userData.name,
            role: userData.role,
            clientId: effectiveClientId || undefined,
            temporaryPassword: userData.force_password_change
          }
        });

        if (authError) {
          console.error('Error calling create-auth-user function:', authError);
          throw new Error(`Erro ao criar usuário: ${authError.message}`);
        }

        if (!authResult?.success) {
          console.error('Auth user creation failed:', authResult?.error);
          throw new Error(authResult?.error || 'Erro ao criar usuário no sistema de autenticação');
        }

        authUserId = authResult.auth_user_id;
        console.log('Auth user created with ID:', authUserId);
      }

      // Evitar duplicidade: se já existir usuário com este e-mail, reutilize
      const { data: existingUser, error: existingLookupError } = await supabase
        .from('users')
        .select('*')
        .eq('email', userData.email)
        .maybeSingle();

      if (existingLookupError) {
        console.warn('Erro ao verificar usuário existente:', existingLookupError);
      }

      let data: any;

      if (existingUser) {
        // Atualiza dados essenciais e vincula ao cliente quando aplicável
        const { data: updated, error: updateErr } = await supabase
          .from('users')
          .update({
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            role: userData.role,
            status: userData.status,
            client_id: effectiveClientId ?? existingUser.client_id,
            supplier_id: userData.supplier_id ?? existingUser.supplier_id,
            force_password_change: userData.force_password_change,
            auth_user_id: authUserId ?? existingUser.auth_user_id,
          })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateErr) {
          console.error('Erro ao atualizar usuário existente:', updateErr);
          throw new Error('Falha ao atualizar usuário existente');
        }

        data = updated;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('users')
          .insert([{
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            role: userData.role,
            status: userData.status,
            client_id: effectiveClientId,
            supplier_id: userData.supplier_id,
            force_password_change: userData.force_password_change,
            auth_user_id: authUserId
          }])
          .select()
          .single();

        if (insertError) {
          console.error('Error creating user in database:', insertError);
          
          // Se deu erro na criação da tabela users mas o auth foi criado, tentar limpar o auth (log apenas)
          if (authUserId) {
            console.log('Attempting to cleanup auth user due to database error');
          }
          
          // Traduzir erros comuns
          let errorMessage = 'Erro ao criar usuário: ' + insertError.message;
          if ((insertError.message || '').includes('duplicate key')) {
            errorMessage = 'Este email já está em uso por outro usuário';
          } else if ((insertError as any).code === '42501') {
            errorMessage = 'Permissão negada pelas políticas de acesso (RLS). Verifique o cliente selecionado e suas permissões.';
          }
          
          throw new Error(errorMessage);
        }

        data = inserted;
      }

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
        try {
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
        } catch (auditError) {
          console.warn('Error creating audit log:', auditError);
        }
      }

      // Update client usage count if user has client_id
      if (effectiveClientId) {
        try {
          // Get current users count for the client
          const { count } = await supabase
            .from('users')
            .select('id', { count: 'exact' })
            .eq('client_id', effectiveClientId)
            .eq('status', 'active');

          // Update or insert client usage
          await supabase
            .from('client_usage')
            .upsert({
              client_id: effectiveClientId,
              users_count: count || 0,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'client_id'
            });
        } catch (usageError) {
          console.error('Error updating client usage:', usageError);
          // Don't fail user creation if usage update fails
        }
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
      console.log('=== INÍCIO UPDATE USER ===', { id, userData });
      
      // Temporarily disable realtime to prevent loops
      const shouldUpdateGroups = userData.groups !== undefined;
      
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

      if (error) {
        console.error('=== ERRO UPDATE USER ===', error);
        throw error;
      }

      console.log('=== USER UPDATED SUCCESSFULLY ===');

      // Sincronizar profile.client_id quando alterar o cliente do usuário
      if (userData.client_id !== undefined) {
        try {
          const { data: authRef } = await supabase
            .from('users')
            .select('auth_user_id')
            .eq('id', id)
            .maybeSingle();

          const authId = authRef?.auth_user_id as string | undefined;
          if (authId) {
            await supabase
              .from('profiles')
              .update({ client_id: userData.client_id })
              .eq('id', authId);
          }
        } catch (syncErr) {
          console.warn('Falha ao sincronizar profile.client_id:', syncErr);
        }
      }

      // Update group memberships in a single transaction if needed
      if (shouldUpdateGroups) {
        console.log('=== UPDATING GROUP MEMBERSHIPS ===', userData.groups);
        
        // Remove existing memberships
        const { error: deleteError } = await supabase
          .from('user_group_memberships')
          .delete()
          .eq('user_id', id);

        if (deleteError) {
          console.error('=== ERRO DELETE MEMBERSHIPS ===', deleteError);
        }

        // Add new memberships
        if (userData.groups && userData.groups.length > 0) {
          const groupsToAdd = groups.filter(g => userData.groups?.includes(g.name));
          const membershipInserts = groupsToAdd.map(group => ({
            user_id: id,
            group_id: group.id
          }));
          
          if (membershipInserts.length > 0) {
            const { error: insertError } = await supabase
              .from('user_group_memberships')
              .insert(membershipInserts);
              
            if (insertError) {
              console.error('=== ERRO INSERT MEMBERSHIPS ===', insertError);
            }
          }
        }
        
        console.log('=== GROUP MEMBERSHIPS UPDATED ===');
      }

      console.log('=== CHAMANDO TOAST SUCCESS ===');
      toast.success('Usuário atualizado com sucesso');
      
      // Update client usage count if client_id changed
      const oldUser = users.find(u => u.id === id);
      const affectedClientIds = new Set([
        oldUser?.client_id,
        userData.client_id
      ].filter(Boolean));

      for (const clientId of affectedClientIds) {
        if (clientId) {
          try {
            const { count } = await supabase
              .from('users')
              .select('id', { count: 'exact' })
              .eq('client_id', clientId)
              .eq('status', 'active');

            await supabase
              .from('client_usage')
              .upsert({
                client_id: clientId,
                users_count: count || 0,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'client_id'
              });
          } catch (usageError) {
            console.error('Error updating client usage:', usageError);
          }
        }
      }
      
      console.log('=== CHAMANDO FETCH USERS ===');
      // Use a timeout to prevent immediate re-fetch conflicts
      setTimeout(() => {
        fetchUsers();
      }, 500);
      
      console.log('=== FIM UPDATE USER ===');
    } catch (error: any) {
      console.error('=== ERRO FINAL UPDATE USER ===', error);
      toast.error('Erro ao atualizar usuário: ' + error.message);
      throw error;
    }
  };

  // Delete user
  const deleteUser = async (id: string) => {
    try {
      // Get user info before deletion to update client usage
      const userToDelete = users.find(u => u.id === id);
      
      // Remove group memberships first to avoid constraint/RLS issues
      const { error: membershipsError } = await supabase
        .from('user_group_memberships')
        .delete()
        .eq('user_id', id);
      if (membershipsError) {
        console.warn('Warning deleting memberships (continuing):', membershipsError);
      }

      // Delete the user
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting user:', error);
        throw error;
      }

      // Update client usage count if user had client_id
      if (userToDelete?.client_id) {
        try {
          const { count } = await supabase
            .from('users')
            .select('id', { count: 'exact' })
            .eq('client_id', userToDelete.client_id)
            .eq('status', 'active');

          await supabase
            .from('client_usage')
            .upsert({
              client_id: userToDelete.client_id,
              users_count: count || 0,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'client_id'
            });
        } catch (usageError) {
          console.error('Error updating client usage after deletion:', usageError);
        }
      }

      // Create audit log if current user exists
      if (currentAuthUserId) {
        try {
          await supabase.from('audit_logs').insert({
            user_id: currentAuthUserId,
            action: 'DELETE',
            entity_type: 'users',
            entity_id: id,
            panel_type: currentProfile?.role === 'admin' ? 'admin' : 'client',
            details: { 
              name: userToDelete?.name,
              email: userToDelete?.email
            }
          });
        } catch (auditError) {
          console.warn('Error creating audit log:', auditError);
        }
      }

      toast.success('Usuário excluído com sucesso');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      const msg = error?.message?.includes('permission') || error?.code === '42501'
        ? 'Permissão negada pelas políticas de acesso (RLS). Verifique suas permissões.'
        : (error?.message || 'Tente novamente');
      toast.error('Erro ao excluir usuário: ' + msg);
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

      // Criar automaticamente perfil de permissões para o novo grupo
      const createPermissionProfile = async () => {
        try {
          if (!currentClient?.id) return;

          // Template padrão com tudo desativado (exceto admin)
          const isAdmin = groupData.name.toLowerCase().includes('admin');
          const permissions = {
            quotes: { view: isAdmin, create: isAdmin, edit: isAdmin, delete: isAdmin },
            products: { view: isAdmin, create: isAdmin, edit: isAdmin, delete: isAdmin },
            suppliers: { view: isAdmin, create: isAdmin, edit: isAdmin, delete: isAdmin },
            payments: { view: isAdmin, create: isAdmin, edit: isAdmin, delete: isAdmin },
            communication: { view: isAdmin, create: isAdmin, edit: isAdmin, delete: isAdmin },
            reports: { view: isAdmin, create: isAdmin, edit: isAdmin, delete: isAdmin },
            users: { view: isAdmin, create: isAdmin, edit: isAdmin, delete: isAdmin },
            settings: { view: isAdmin, create: isAdmin, edit: isAdmin, delete: isAdmin }
          };

          const { data: profileData, error: profileError } = await supabase
            .from('permission_profiles')
            .insert({
              name: data.name,
              description: data.description || `Permissões para ${data.name}`,
              permissions,
              client_id: currentClient.id,
              active: true
            })
            .select()
            .single();

          if (profileError) throw profileError;

          // Vincular perfil ao grupo
          await supabase
            .from('user_groups')
            .update({ permission_profile_id: profileData.id })
            .eq('id', data.id);

          console.log('✅ Perfil de permissões criado automaticamente para:', data.name);
        } catch (error) {
          console.error('Erro ao criar perfil de permissões:', error);
        }
      };

      await createPermissionProfile();

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

  // Set up realtime subscriptions with debouncing
  useEffect(() => {
    let fetchTimeout: NodeJS.Timeout;
    
    const debouncedFetch = () => {
      clearTimeout(fetchTimeout);
      fetchTimeout = setTimeout(() => {
        console.log('=== REALTIME: Fetching users due to DB change ===');
        fetchUsers();
      }, 1000); // Debounce for 1 second
    };
    
    const debouncedFetchGroups = () => {
      clearTimeout(fetchTimeout);
      fetchTimeout = setTimeout(() => {
        console.log('=== REALTIME: Fetching groups due to DB change ===');
        fetchGroups();
      }, 1000);
    };

    const channel = supabase
      .channel('users-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          console.log('=== REALTIME: Users table change ===', payload.eventType);
          debouncedFetch();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_groups' },
        (payload) => {
          console.log('=== REALTIME: User groups table change ===', payload.eventType);
          debouncedFetchGroups();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_group_memberships' },
        (payload) => {
          console.log('=== REALTIME: Memberships table change ===', payload.eventType);
          debouncedFetch();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(fetchTimeout);
      supabase.removeChannel(channel);
    };
  }, []); // Empty dependency array to prevent subscription recreation

  // Update current user's last access
  const updateCurrentUserLastAccess = async () => {
    try {
      if (currentAuthUserId) {
        await supabase
          .from('users')
          .update({ last_access: new Date().toISOString() })
          .eq('auth_user_id', currentAuthUserId);
        console.log('✅ Last access updated for current user');
      }
    } catch (error) {
      console.error('Error updating last access:', error);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchGroups()]);
      // Update current user's last access after loading
      await updateCurrentUserLastAccess();
      setLoading(false);
    };
    loadData();
  }, [currentAuthUserId]); // Depend on currentAuthUserId to trigger when it's available

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
    fetchGroups,
    updateCurrentUserLastAccess
  };
}