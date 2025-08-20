import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'client' | 'supplier' | 'support';

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
  switch (role) {
    case 'admin':
      return '/admin/superadmin';
    case 'client':
      return '/dashboard';
    case 'supplier':
      return '/supplier';
    case 'support':
      return '/support';
    default:
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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    console.log('Fetching profile for user:', supabaseUser.id, supabaseUser.email);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      console.log('Profile query result:', { profile, error });

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        setIsLoading(false);
        return;
      }

      if (profile) {
        console.log('Setting user from profile:', profile);
        setUser({
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role as UserRole,
          avatar: profile.avatar_url,
          companyName: profile.company_name,
          active: profile.active,
          clientId: profile.client_id,
          supplierId: profile.supplier_id,
        });
      } else {
        console.log('No profile found, creating default user');
        // Profile doesn't exist, user might need to complete registration
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || supabaseUser.email || '',
          role: 'client',
          active: true,
        });
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
    }
  };

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
    </AuthContext.Provider>
  );
};