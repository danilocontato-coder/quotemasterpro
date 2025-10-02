import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ForcePasswordChangeModal } from '@/components/auth/ForcePasswordChangeModal';
import { logger } from '@/utils/systemLogger';

export type UserRole = 'admin' | 'client' | 'manager' | 'collaborator' | 'supplier' | 'support';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  companyName?: string;
  active: boolean;
  clientId?: string;
  supplierId?: string;
}

export const getRoleBasedRoute = (
  role: UserRole,
  ctx?: { supplierId?: string | null; clientId?: string | null; tenantType?: string | null }
): string => {
  console.log('getRoleBasedRoute called with', { role, ctx });

  // Admin and support have priority routes regardless of tenant
  if (role === 'admin') {
    return '/admin/superadmin';
  }
  if (role === 'support') {
    return '/support';
  }

  // Supplier context wins over role when supplierId/tenantType indicate supplier
  const isSupplierContext = ctx?.tenantType === 'supplier' || !!ctx?.supplierId;
  if (isSupplierContext) {
    return '/supplier';
  }

  // Default client-side dashboards
  switch (role) {
    case 'manager':
    case 'client':
    case 'collaborator':
      return '/dashboard';
    default:
      return '/dashboard';
  }
};

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  isAdminMode: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  useEffect(() => {
    logger.auth('AuthProvider inicializado');
    
    // Verificar se há token admin na URL primeiro
    const checkAdminToken = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const adminToken = urlParams.get('adminToken');
      
      if (adminToken) {
        logger.auth('Admin token detectado', { adminToken });
        let adminData = sessionStorage.getItem(`adminAccess_${adminToken}`);
        if (!adminData) {
          adminData = localStorage.getItem(`adminAccess_${adminToken}`);
        }
        
        if (adminData) {
          try {
            const parsedData = JSON.parse(adminData);
            logger.auth('Admin access data parsed', parsedData);
            
            // Simular usuário logado como cliente/fornecedor
            if (parsedData.targetRole === 'manager' && parsedData.targetClientId) {
              simulateClientLogin(parsedData);
              return true;
            } else if (parsedData.targetRole === 'supplier' && parsedData.targetSupplierId) {
              simulateSupplierLogin(parsedData);
              return true;
            }
          } catch (error) {
            console.error('❌ Error parsing admin data:', error);
          }
        }
      }
      return false;
    };

    // Se não há token admin, inicializar autenticação normal
    if (!checkAdminToken()) {
      const initializeAuth = async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('❌ Error getting initial session:', error);
            setIsLoading(false);
            return;
          }
          
          console.log('🔍 Initial session check:', { hasSession: !!session, userId: session?.user?.id });
          
          setSession(session);
          if (session?.user) {
            fetchUserProfile(session.user);
          } else {
            setIsLoading(false);
          }
        } catch (error) {
          console.error('❌ Error initializing auth:', error);
          setIsLoading(false);
        }
      };

      initializeAuth();
    }

    // Listen for auth changes - otimizado para evitar reloads
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.auth('Auth state change', { event, hasSession: !!session, userId: session?.user?.id });
        
        // Ignorar eventos de token refresh se usuário não mudou
        if (event === 'TOKEN_REFRESHED' && session?.user?.id === user?.id) {
          logger.auth('Token refresh - mantendo estado');
          setSession(session); // Apenas atualizar sessão
          return;
        }
        
        // Ignorar eventos duplicados
        if (event === 'SIGNED_IN' && session?.user?.id === user?.id) {
          logger.auth('SIGNED_IN duplicado - ignorando');
          return;
        }
        
        setSession(session);
        
        if (session?.user) {
          fetchUserProfile(session.user);
        } else {
          logger.auth('Sem sessão - limpando estado');
          setUser(null);
          setError(null);
          setForcePasswordChange(false);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Função para simular login como cliente
  const simulateClientLogin = async (adminData: any) => {
    console.log('🔍 [DEBUG-AUTH] Simulating client login:', adminData);
    setIsLoading(true);
    
    try {
      // Buscar dados do cliente
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', adminData.targetClientId)
        .single();

      if (clientError || !clientData) {
        console.error('❌ Error fetching client data:', clientError);
        setError('Cliente não encontrado');
        setIsLoading(false);
        return;
      }

      // Criar usuário simulado
      const simulatedUser: User = {
        id: `admin_simulated_${adminData.targetClientId}`,
        email: clientData.email,
        name: adminData.targetClientName || clientData.name,
        role: 'manager' as UserRole,
        active: true,
        clientId: adminData.targetClientId,
        companyName: clientData.company_name || clientData.name
      };

      console.log('✅ Simulated client user created:', simulatedUser);
      setUser(simulatedUser);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error simulating client login:', error);
      setError('Erro ao simular acesso como cliente');
      setIsLoading(false);
    }
  };

  // Função para simular login como fornecedor
  const simulateSupplierLogin = async (adminData: any) => {
    console.log('🔍 [DEBUG-AUTH] Simulating supplier login:', adminData);
    setIsLoading(true);
    
    try {
      // Buscar dados do fornecedor
      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', adminData.targetSupplierId)
        .single();

      if (supplierError || !supplierData) {
        console.error('❌ Error fetching supplier data:', supplierError);
        setError('Fornecedor não encontrado');
        setIsLoading(false);
        return;
      }

      // Criar usuário simulado
      const simulatedUser: User = {
        id: `admin_simulated_${adminData.targetSupplierId}`,
        email: supplierData.email,
        name: adminData.targetSupplierName || supplierData.name,
        role: 'supplier' as UserRole,
        active: true,
        supplierId: adminData.targetSupplierId,
        companyName: supplierData.name
      };

      console.log('✅ Simulated supplier user created:', simulatedUser);
      setUser(simulatedUser);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error simulating supplier login:', error);
      setError('Erro ao simular acesso como fornecedor');
      setIsLoading(false);
    }
  };

  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser) => {
    logger.auth('Carregando perfil do usuário', { userId: supabaseUser.id });
    setIsLoading(true);
    
    try {
      // Fetch both profile and user record to check force_password_change
      const [profileResult, userResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .maybeSingle(),
        supabase
          .from('users')
          .select('force_password_change')
          .eq('auth_user_id', supabaseUser.id)
          .maybeSingle()
      ]);

      const { data: profile, error: profileError } = profileResult;
      const { data: userRecord } = userResult;

      // Check if password change is required
      if (userRecord?.force_password_change === true) {
        setForcePasswordChange(true);
      } else {
        setForcePasswordChange(false);
      }

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // Create a basic user even if profile fetch fails
        const fallbackUser = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || supabaseUser.email || '',
          role: 'collaborator' as UserRole,
          active: true,
        };
        setUser(fallbackUser);
        return;
      }

      if (profile) {
        console.log('✅ Profile encontrado:', {
          id: profile.id,
          email: profile.email,
          client_id: profile.client_id,
          onboarding_completed: profile.onboarding_completed,
          role: profile.role
        });

        // Verificar se é usuário de cliente e se o cliente está ativo
        if (profile.client_id) {
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('status')
            .eq('id', profile.client_id)
            .maybeSingle();

          if (clientError) {
            console.error('Erro ao verificar status do cliente:', clientError);
          } else if (clientData && clientData.status !== 'active') {
            console.log('⚠️ Cliente inativo, fazendo logout do usuário');
            setError('Sua conta foi desativada. Entre em contato com o administrador.');
            setUser(null);
            setIsLoading(false);
            await supabase.auth.signOut();
            return;
          }
        }

        // Verificar se é usuário de fornecedor e se o fornecedor está ativo
        if (profile.supplier_id) {
          const { data: supplierData, error: supplierError } = await supabase
            .from('suppliers')
            .select('status')
            .eq('id', profile.supplier_id)
            .maybeSingle();

          if (supplierError) {
            console.error('Erro ao verificar status do fornecedor:', supplierError);
          } else if (supplierData && supplierData.status !== 'active') {
            console.log('⚠️ Fornecedor inativo, fazendo logout do usuário');
            setError('Sua conta de fornecedor foi desativada. Entre em contato com o administrador.');
            setUser(null);
            setIsLoading(false);
            await supabase.auth.signOut();
            return;
          }
        }

        // Atualizar last_access na tabela users quando usuário faz login
        if (userRecord) {
          await supabase
            .from('users')
            .update({ last_access: new Date().toISOString() })
            .eq('auth_user_id', supabaseUser.id);
        }

        const userProfile: User = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role as UserRole,
          avatar: profile.avatar_url,
          companyName: profile.company_name,
          active: profile.active,
          clientId: profile.client_id,
          supplierId: profile.supplier_id,
        };
        setUser(userProfile);
        setError(null); // Limpar qualquer erro anterior ao fazer login com sucesso
      } else {
        console.log('⚠️ Profile não encontrado, criando usuário básico');
        // Profile doesn't exist, create a basic user
        const basicUser = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || supabaseUser.email || '',
          role: 'collaborator' as UserRole,
          active: true,
        };
        setUser(basicUser);
        setError(null); // Limpar qualquer erro anterior ao fazer login com sucesso
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      // Fallback user creation
      const errorFallbackUser = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.name || supabaseUser.email || '',
        role: 'collaborator' as UserRole,
        active: true,
      };
      setUser(errorFallbackUser);
      setError(null); // Limpar qualquer erro anterior mesmo em caso de fallback
    } finally {
      setIsLoading(false);
    }
  }, []); // sem dependências - função estável

  const handlePasswordChanged = () => {
    setForcePasswordChange(false);
  };

  // Listen for profile updates from settings - only if user exists and hasn't changed
  useEffect(() => {
    if (!user?.id) return; // Early return if no user

    const handleProfileUpdate = (event: any) => {
      if (user && event.detail) {
        const updates: Partial<User> = {};
        if (event.detail.name) updates.name = event.detail.name;
        if (event.detail.company_name) updates.companyName = event.detail.company_name;
        if (event.detail.avatar_url) updates.avatar = event.detail.avatar_url;
        
        setUser(prevUser => prevUser ? { ...prevUser, ...updates } : null);
      }
    };

    const handleAvatarUpdate = (event: any) => {
      if (user && event.detail?.avatar_url) {
        setUser(prevUser => prevUser ? { ...prevUser, avatar: event.detail.avatar_url } : null);
      }
    };

    // Listen for the custom event we dispatch from useRealtimeDataSync
    const handleProfileReload = () => {
      if (user?.id && session?.user) {
        // Use existing session user instead of making another API call
        fetchUserProfile(session.user);
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    window.addEventListener('userAvatarUpdated', handleAvatarUpdate);
    window.addEventListener('user-profile-updated', handleProfileReload);

    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
      window.removeEventListener('userAvatarUpdated', handleAvatarUpdate);
      window.removeEventListener('user-profile-updated', handleProfileReload);
    };
  }, [user?.id]); // Only depend on user ID to prevent unnecessary re-runs

  const logout = useCallback(async (): Promise<void> => {
    logger.auth('Logout iniciado', { userId: user?.id });
    
    // Verificar se é usuário simulado (admin mode)
    if (user?.id?.startsWith('admin_simulated_')) {
      setUser(null);
      setSession(null);
      window.close();
      return;
    }
    
    await supabase.auth.signOut();
  }, [user?.id]);

  const updateProfile = useCallback(async (updates: Partial<User>): Promise<void> => {
    if (!user) return;
    
    logger.info('auth', 'Atualizando perfil', updates);
    
    // Se for usuário simulado, não tentar atualizar no banco
    if (user.id.startsWith('admin_simulated_')) {
      setUser({ ...user, ...updates });
      return;
    }
    
    if (!session) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: updates.name,
          avatar_url: updates.avatar,
          company_name: updates.companyName,
          role: updates.role,
        })
        .eq('id', user.id);

      if (error) throw error;

      setUser({ ...user, ...updates });
    } catch (error) {
      logger.error('auth', 'Erro ao atualizar perfil', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, session]);

  const isAdminMode = useCallback((): boolean => {
    return user?.id?.startsWith('admin_simulated_') || false;
  }, [user?.id]);

  const value = useMemo(() => ({
    user,
    session,
    isLoading,
    error,
    logout,
    updateProfile,
    isAdminMode,
  }), [user, session, isLoading, error, logout, updateProfile, isAdminMode]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      
      {/* Modal obrigatório de troca de senha */}
      {forcePasswordChange && user && (
        <ForcePasswordChangeModal
          open={forcePasswordChange}
          userEmail={user.email}
          onPasswordChanged={handlePasswordChanged}
        />
      )}
    </AuthContext.Provider>
  );
});