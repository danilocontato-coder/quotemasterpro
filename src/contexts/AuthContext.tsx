import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ForcePasswordChangeModal } from '@/components/auth/ForcePasswordChangeModal';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  useEffect(() => {
    console.log('🔍 [DEBUG-AUTH] AuthProvider useEffect triggered for session initialization');
    // Get initial session
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

    // Listen for auth changes - com filtros para evitar reloads desnecessários
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔍 [DEBUG-AUTH] Auth state changed:', {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          currentUserId: user?.id,
          timestamp: new Date().toISOString(),
          pageHidden: document.hidden
        });
        
        // Ignorar eventos que não requerem ação (evitar loops)
        if (event === 'TOKEN_REFRESHED' && session?.user?.id === user?.id) {
          console.log('🔍 [DEBUG-AUTH] Token refresh - mantendo estado atual');
          return;
        }
        
        // Verificar se página está visível antes de processar mudanças
        if (document.hidden && event === 'SIGNED_IN') {
          console.log('🔍 [DEBUG-AUTH] Sign in detectado com página oculta - adiando processamento');
          return;
        }
        
        console.log('🔍 [DEBUG-AUTH] Processando mudança de auth state...');
        setSession(session);
        
        if (session?.user) {
          // Use setTimeout para evitar bloquear mudança de estado de auth
          setTimeout(() => {
            console.log('🔍 [DEBUG-AUTH] Chamando fetchUserProfile...');
            fetchUserProfile(session.user);
          }, 0);
        } else {
          console.log('🔍 [DEBUG-AUTH] Sem sessão - limpando user state');
          setUser(null);
          setError(null); // Limpar erro ao fazer logout
          setForcePasswordChange(false);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    console.log('🔍 [DEBUG-AUTH] fetchUserProfile called for user:', supabaseUser.id);
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
  };

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

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    if (!user || !session) return;
    
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
      console.error('Error updating profile:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    session,
    isLoading,
    error,
    logout,
    updateProfile,
  };

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
};