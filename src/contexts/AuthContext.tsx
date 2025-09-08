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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('Error getting initial session:', error);
          setIsLoading(false);
          return;
        }
        
        setSession(session);
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes - simplified
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
          setIsLoading(false);
          setForcePasswordChange(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Run only once

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    setIsLoading(true);
    
    try {
      // Fetch both profile and user record
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
      // Fallback user creation
      const errorFallbackUser = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.name || supabaseUser.email || '',
        role: 'collaborator' as UserRole,
        active: true,
      };
      setUser(errorFallbackUser);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChanged = () => {
    setForcePasswordChange(false);
  };

  // Simplified profile update listeners
  useEffect(() => {
    if (!user?.id) return;

    const handleProfileUpdate = (event: any) => {
      if (user && event.detail) {
        const updates: Partial<User> = {};
        if (event.detail.name) updates.name = event.detail.name;
        if (event.detail.company_name) updates.companyName = event.detail.company_name;
        if (event.detail.avatar_url) updates.avatar = event.detail.avatar_url;
        
        setUser(prevUser => prevUser ? { ...prevUser, ...updates } : null);
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, [user?.id]);

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