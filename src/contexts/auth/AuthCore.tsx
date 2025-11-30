import React, { createContext, useContext, useState, useCallback } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/systemLogger';

export type UserRole = 'admin' | 'admin_cliente' | 'client' | 'manager' | 'collaborator' | 'supplier' | 'support';

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
  onboardingCompleted?: boolean;
  tourCompleted?: boolean;
  tenantType?: string;
  forcePasswordChange?: boolean;
  termsAccepted?: boolean;
  clientType?: string; // 'direct' | 'administradora' | 'condominio_vinculado'
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  checkAdminMode: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthCore = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAdminMode = useCallback((): boolean => {
    return user?.id?.startsWith('admin_simulated_') || false;
  }, [user?.id]);

  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser) => {
    setIsLoading(true);
    
    try {
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

      if (profileError) {
        logger.error('auth', 'Erro ao buscar perfil', profileError);
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
        // Verificar se cliente está ativo e buscar client_type
        let clientType: string | null = null;
        if (profile.client_id) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('status, client_type')
            .eq('id', profile.client_id)
            .maybeSingle();

          if (clientData && clientData.status !== 'active') {
            setError('Sua conta foi desativada. Entre em contato com o administrador.');
            setUser(null);
            setIsLoading(false);
            await supabase.auth.signOut();
            return;
          }
          
          clientType = clientData?.client_type || null;
        }

        // Verificar se fornecedor está ativo
        if (profile.supplier_id) {
          const { data: supplierData } = await supabase
            .from('suppliers')
            .select('status')
            .eq('id', profile.supplier_id)
            .maybeSingle();

          if (supplierData && supplierData.status !== 'active') {
            setError('Sua conta de fornecedor foi desativada. Entre em contato com o administrador.');
            setUser(null);
            setIsLoading(false);
            await supabase.auth.signOut();
            return;
          }
        }

        // Atualizar last_access
        if (userRecord) {
          await supabase
            .from('users')
            .update({ last_access: new Date().toISOString() })
            .eq('auth_user_id', supabaseUser.id);
        }

        // Buscar role via função SQL segura (evita ataques de escalação de privilégio)
        const { data: secureRole, error: roleError } = await supabase
          .rpc('get_user_role');

        if (roleError) {
          logger.error('auth', 'Erro ao buscar role seguro', roleError);
        }

        const userProfile: User = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: (secureRole || profile.role || 'collaborator') as UserRole,
          avatar: profile.avatar_url,
          companyName: profile.company_name,
          active: profile.active,
          clientId: profile.client_id,
          supplierId: profile.supplier_id,
          tenantType: profile.tenant_type,
          onboardingCompleted: profile.onboarding_completed,
          tourCompleted: profile.tour_completed,
          forcePasswordChange: userRecord?.force_password_change,
          termsAccepted: profile.terms_accepted ?? false,
          clientType: clientType || undefined,
        };

        setUser(userProfile);
      }
    } catch (error) {
      logger.error('auth', 'Erro ao carregar perfil', error);
      setError('Erro ao carregar perfil do usuário');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
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

  return {
    user,
    setUser,
    session,
    setSession,
    isLoading,
    setIsLoading,
    error,
    setError,
    checkAdminMode,
    fetchUserProfile,
    logout,
    updateProfile,
  };
};

export { AuthContext };
