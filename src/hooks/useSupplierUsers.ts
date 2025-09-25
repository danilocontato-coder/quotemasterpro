import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SupplierUser {
  id: string;
  auth_user_id?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'manager' | 'collaborator' | 'supplier';
  status: 'active' | 'inactive';
  avatar_url?: string;
  last_access?: string;
  created_at: string;
  updated_at: string;
  supplier_id: string;
  force_password_change: boolean;
  permission_profile_id?: string;
}

export interface SupplierPermissionProfile {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, Record<string, boolean>>;
  active: boolean;
  client_id: string; // Using client_id as it maps to suppliers in this context
  created_at: string;
  updated_at: string;
}

export const useSupplierUsers = () => {
  const [users, setUsers] = useState<SupplierUser[]>([]);
  const [permissionProfiles, setPermissionProfiles] = useState<SupplierPermissionProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Get current user from Supabase
  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  };

  // Get current supplier ID
  const getCurrentSupplierID = async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) return null;
    
    const { data } = await supabase
      .from('profiles')
      .select('supplier_id')
      .eq('id', currentUser.id)
      .single();
    
    return data?.supplier_id || null;
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const supplierId = await getCurrentSupplierID();
      
      if (!supplierId) {
        console.error('Supplier ID not found');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          permission_profiles:permission_profile_id (
            id,
            name,
            description
          )
        `)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data || []) as SupplierUser[]);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  // Fetch permission profiles
  const fetchPermissionProfiles = async () => {
    try {
      const supplierId = await getCurrentSupplierID();
      
      if (!supplierId) return;

      const { data, error } = await supabase
        .from('permission_profiles')
        .select('*')
        .or(`supplier_id.eq.${supplierId},supplier_id.is.null`)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setPermissionProfiles((data || []).map(item => ({
        ...item,
        permissions: item.permissions as Record<string, Record<string, boolean>>
      })));
    } catch (error) {
      console.error('Erro ao buscar perfis de permissão:', error);
    }
  };

  // Create user with auth
  const createUser = async (userData: Partial<SupplierUser> & { password?: string }) => {
    try {
      const supplierId = await getCurrentSupplierID();
      
      if (!supplierId) {
        throw new Error('Supplier ID não encontrado');
      }

      // Create authentication user via Edge Function
      const { data: authResponse, error: authError } = await supabase.functions.invoke('create-auth-user', {
        body: {
          action: 'create',
          email: userData.email!,
          password: userData.password || `temp${Math.random().toString(36).slice(-8)}`,
          name: userData.name,
          role: userData.role, // Use the actual role selected
          // supplierId: inferido automaticamente pela função (criador é o fornecedor)
          temporaryPassword: true
        }
      });

      if (authError) throw authError;
      if (!authResponse.success) throw new Error(authResponse.error || 'Erro ao criar autenticação');

      toast.success('Usuário criado com sucesso!');
      fetchUsers();
      return authResponse;
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      toast.error('Erro ao criar usuário');
      throw error;
    }
  };

  // Update user
  const updateUser = async (userId: string, userData: Partial<SupplierUser>) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Usuário atualizado com sucesso!');
      fetchUsers();
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário');
      throw error;
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    console.log('🗑️ [SUPPLIER-USERS] Iniciando exclusão de usuário:', userId);
    
    try {
      // Primeiro buscar os dados do usuário para garantir que existe
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('🗑️ [SUPPLIER-USERS] Erro ao buscar usuário:', userError);
        throw userError;
      }

      if (!userData) {
        console.error('🗑️ [SUPPLIER-USERS] Usuário não encontrado:', userId);
        throw new Error('Usuário não encontrado');
      }

      console.log('🗑️ [SUPPLIER-USERS] Dados do usuário encontrado:', userData);

      // Agora tentar excluir
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        console.error('🗑️ [SUPPLIER-USERS] Erro ao excluir usuário:', deleteError);
        throw deleteError;
      }

      console.log('✅ [SUPPLIER-USERS] Usuário excluído com sucesso');
      toast.success('Usuário removido com sucesso!');
      fetchUsers();
    } catch (error) {
      console.error('❌ [SUPPLIER-USERS] Erro completo ao remover usuário:', error);
      toast.error(`Erro ao remover usuário: ${error.message || 'Erro desconhecido'}`);
      throw error;
    }
  };

  // Toggle user status
  const toggleUserStatus = async (userId: string, status: 'active' | 'inactive') => {
    try {
      await updateUser(userId, { status });
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
    }
  };

  // Create permission profile
  const createPermissionProfile = async (profileData: Partial<SupplierPermissionProfile>) => {
    try {
      const supplierId = await getCurrentSupplierID();
      
      if (!supplierId) {
        throw new Error('Supplier ID não encontrado');
      }

      const { data, error } = await supabase
        .from('permission_profiles')
        .insert({
          name: profileData.name!,
          description: profileData.description,
          permissions: profileData.permissions!,
          supplier_id: supplierId,
          active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Perfil de permissão criado com sucesso!');
      fetchPermissionProfiles();
      return data;
    } catch (error) {
      console.error('Erro ao criar perfil de permissão:', error);
      toast.error('Erro ao criar perfil de permissão');
      throw error;
    }
  };

  // Update permission profile
  const updatePermissionProfile = async (profileId: string, profileData: Partial<SupplierPermissionProfile>) => {
    try {
      const { error } = await supabase
        .from('permission_profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);

      if (error) throw error;

      toast.success('Perfil de permissão atualizado!');
      fetchPermissionProfiles();
    } catch (error) {
      console.error('Erro ao atualizar perfil de permissão:', error);
      toast.error('Erro ao atualizar perfil de permissão');
      throw error;
    }
  };

  // Filter users by search term
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchUsers();
    fetchPermissionProfiles();
  }, []);

  return {
    users,
    filteredUsers,
    permissionProfiles,
    loading,
    searchTerm,
    setSearchTerm,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    createPermissionProfile,
    updatePermissionProfile,
    fetchUsers,
    fetchPermissionProfiles
  };
};