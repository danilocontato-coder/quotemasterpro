import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { ForcePasswordChangeModal } from '@/components/auth/ForcePasswordChangeModal';

export type UserRole = 'admin' | 'manager' | 'client' | 'collaborator' | 'supplier' | 'support';

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
      return '/app/admin';
    case 'manager':
    case 'client':
    case 'collaborator':
      return '/app/dashboard';
    case 'supplier':
      return '/app/supplier';
    case 'support':
      return '/app/dashboard';
    default:
      return '/app/dashboard';
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
  const isMountedRef = useRef(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMountedRef.current) {
          setSession(session);
          if (session?.user) {
            await fetchUserProfile(session.user);
          } else {
            setIsLoading(false);
          }
        }
      } catch (error) {
        if (isMountedRef.current) setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMountedRef.current) return;
        
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
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    // SIMPLIFICADO: Sempre usa dados do user_metadata ou fallback
    const userProfile: User = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name || supabaseUser.email || '',
      role: (supabaseUser.user_metadata?.role as UserRole) || 'manager',
      active: true,
    };
    
    setUser(userProfile);
    setIsLoading(false);
  };

  const handlePasswordChanged = () => {
    setForcePasswordChange(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    
    try {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      
      // Dispatch custom event for profile updates
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: updates 
      }));
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <ForcePasswordChangeModal 
        open={forcePasswordChange} 
        userEmail={user?.email || ''}
        onPasswordChanged={handlePasswordChanged}
      />
    </AuthContext.Provider>
  );
};