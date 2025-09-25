import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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

export const getRoleBasedRoute = (role: UserRole): string => {
  console.log('getRoleBasedRoute called with role:', role);
  switch (role) {
    case 'admin':
      console.log('Redirecting admin to /admin/superadmin');
      return '/admin/superadmin';
    case 'manager':
      console.log('Redirecting manager to /dashboard');
      return '/dashboard';
    case 'client':
      console.log('Redirecting client to /dashboard');
      return '/dashboard';
    case 'supplier':
      console.log('Redirecting supplier to /supplier');
      return '/supplier';
    case 'support':
      console.log('Redirecting support to /support');
      return '/support';
    default:
      console.log('Unknown role', role, 'redirecting to /dashboard');
      return '/dashboard';
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.warn('[AuthContext] useAuth called outside AuthProvider. Returning safe defaults.');
    const fallback: AuthContextType = {
      user: null,
      session: null,
      isLoading: false,
      logout: async () => {},
      updateProfile: async () => {},
    };
    return fallback;
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const initialized = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    if (initialized.current) return; // Evita execução dupla em StrictMode
    initialized.current = true;
    
    console.log('🔍 [DEBUG-AUTH] AuthProvider initializing...');
    
    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('🔍 [DEBUG-AUTH] Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted.current) return;
        
        if (error) {
          console.error('❌ Error getting initial session:', error);
          setIsLoading(false);
          return;
        }
        
        console.log('🔍 Initial session check:', { hasSession: !!session, userId: session?.user?.id });
        
        setSession(session);
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted.current) return;
        
        console.log('🔍 [DEBUG-AUTH] Auth state changed:', {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          timestamp: new Date().toISOString()
        });
        
        // Ignorar eventos que não requerem ação
        if (event === 'TOKEN_REFRESHED' && session?.user?.id === user?.id) {
          console.log('🔍 [DEBUG-AUTH] Token refresh - mantendo estado atual');
          setSession(session); // Atualiza a sessão mas mantém o user
          return;
        }
        
        console.log('🔍 [DEBUG-AUTH] Processando mudança de auth state...');
        setSession(session);
        
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          console.log('🔍 [DEBUG-AUTH] Sem sessão - limpando user state');
          setUser(null);
          setForcePasswordChange(false);
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    if (!isMounted.current) return;
    
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

      if (!isMounted.current) return;

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
        setIsLoading(false);
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

        // Atualizar last_access na tabela users quando usuário faz login
        if (userRecord) {
          supabase
            .from('users')
            .update({ last_access: new Date().toISOString() })
            .eq('auth_user_id', supabaseUser.id)
            .then(() => console.log('✅ Last access updated'));
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
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      if (isMounted.current) {
        // Fallback user creation
        const errorFallbackUser = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || supabaseUser.email || '',
          role: 'collaborator' as UserRole,
          active: true,
        };
        setUser(errorFallbackUser);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
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