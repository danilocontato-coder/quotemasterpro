import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ForcePasswordChangeModal } from '@/components/auth/ForcePasswordChangeModal';
import { TermsOfUseModal } from '@/components/auth/TermsOfUseModal';
import { logger } from '@/utils/systemLogger';
import { Loader2 } from 'lucide-react';

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

export const getRoleBasedRoute = (
  role: UserRole,
  ctx?: { 
    supplierId?: string | null; 
    clientId?: string | null; 
    tenantType?: string | null;
    clientType?: string | null; // 'direct' | 'administradora' | 'condominio_vinculado'
  }
): string => {
  logger.navigation('getRoleBasedRoute', { role, ctx });

  // APENAS admin global acessa superadmin
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

  // Redirecionar baseado no tipo de cliente
  if (ctx?.clientType === 'condominio_vinculado') {
    return '/condominio';
  }
  
  if (ctx?.clientType === 'administradora') {
    return '/administradora/dashboard';
  }

  // Client/Manager direto (client_type = 'direct' ou null)
  switch (role) {
    case 'admin_cliente':
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [needsTermsAcceptance, setNeedsTermsAcceptance] = useState(false);

  // Memoizar função de check admin mode
  const checkAdminMode = useCallback((): boolean => {
    return user?.id?.startsWith('admin_simulated_') || false;
  }, [user?.id]);

  // Definir fetchUserProfile como useCallback estável
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

      // Feature flag check para verificação de termos (será usado após setUser)

      if (profileError) {
        logger.error('auth', 'Erro ao buscar perfil', profileError);
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
        logger.auth('Profile encontrado', {
          id: profile.id,
          email: profile.email,
          client_id: profile.client_id,
          role: profile.role,
          bypass_terms: (profile as any).bypass_terms,
          terms_accepted: profile.terms_accepted,
          onboarding_completed: profile.onboarding_completed
        });

        // Verificar se é usuário de cliente, se está ativo e buscar client_type
        let clientType: string | null = null;
        if (profile.client_id) {
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('status, client_type')
            .eq('id', profile.client_id)
            .maybeSingle();

          if (clientError) {
            logger.error('auth', 'Erro ao verificar status do cliente', clientError);
          } else if (clientData && clientData.status !== 'active') {
            logger.warn('auth', 'Cliente inativo - fazendo logout');
            setError('Sua conta foi desativada. Entre em contato com o administrador.');
            setUser(null);
            setIsLoading(false);
            await supabase.auth.signOut();
            return;
          }
          
          clientType = clientData?.client_type || null;
        }

        // Verificar se é usuário de fornecedor e se o fornecedor está ativo
        if (profile.supplier_id) {
          const { data: supplierData, error: supplierError } = await supabase
            .from('suppliers')
            .select('status')
            .eq('id', profile.supplier_id)
            .maybeSingle();

          if (supplierError) {
            logger.error('auth', 'Erro ao verificar status do fornecedor', supplierError);
          } else if (supplierData && supplierData.status !== 'active') {
            logger.warn('auth', 'Fornecedor inativo - fazendo logout');
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
          onboardingCompleted: profile.onboarding_completed,
          tourCompleted: profile.tour_completed,
          tenantType: profile.tenant_type,
          forcePasswordChange: userRecord?.force_password_change ?? false,
          termsAccepted: profile.terms_accepted ?? false,
          clientType: clientType || undefined,
        };
        setUser(userProfile); // 1º: Setar user primeiro

        // CRÍTICO: Verificar termos APÓS setar user (garante que modal pode renderizar)
        const { data: featureFlagData } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'terms_feature_flags')
          .single();
        
        // Fail-safe: se não conseguir buscar settings, assume que termos são obrigatórios
        const enforceTerms = featureFlagData?.setting_value 
          ? (featureFlagData.setting_value as any)?.enforce_terms || false
          : true;

        if (enforceTerms && profile.terms_accepted === false && (profile as any).bypass_terms !== true) {
          logger.info('auth', '[TERMS-CHECK] Usuário precisa aceitar termos');
          setNeedsTermsAcceptance(true);
          
          // Timeout de segurança: re-forçar estado
          setTimeout(() => {
            setNeedsTermsAcceptance(true);
          }, 100);
        } else {
          setNeedsTermsAcceptance(false);
        }

        setError(null);
      } else {
        logger.warn('auth', 'Profile não encontrado - criando usuário básico');
        // Profile doesn't exist, create a basic user
        const basicUser = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || supabaseUser.email || '',
          role: 'collaborator' as UserRole,
          active: true,
        };
        setUser(basicUser);
        setError(null);
      }
    } catch (error) {
      logger.error('auth', 'Erro em fetchUserProfile', error);
      // Fallback user creation
      const errorFallbackUser = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.name || supabaseUser.email || '',
        role: 'collaborator' as UserRole,
        active: true,
      };
      setUser(errorFallbackUser);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // useEffect para re-verificar termos quando user mudar
  useEffect(() => {
    if (!user) return;

    const recheckTerms = async () => {
      const { data: featureFlagData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'terms_feature_flags')
        .single();
      
      // Fail-safe: se não conseguir buscar settings, assume que termos são obrigatórios
      const enforceTerms = featureFlagData?.setting_value 
        ? (featureFlagData.setting_value as any)?.enforce_terms || false
        : true;

      if (enforceTerms && user.termsAccepted === false) {
        logger.info('auth', '[TERMS-RECHECK] Modal de termos necessário', {
          userId: user.id,
          email: user.email
        });
        setNeedsTermsAcceptance(true);
      } else {
        setNeedsTermsAcceptance(false);
      }
    };

    recheckTerms();
  }, [user?.id, user?.termsAccepted]);

  // Função para simular login como cliente
  const simulateClientLogin = useCallback(async (adminData: any) => {
    logger.auth('Simulando login de cliente', adminData);
    setIsLoading(true);
    
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', adminData.targetClientId)
        .single();

      if (clientError || !clientData) {
        logger.error('auth', 'Erro ao buscar dados do cliente', clientError);
        setError('Cliente não encontrado');
        setIsLoading(false);
        return;
      }

      const simulatedUser: User = {
        id: `admin_simulated_${adminData.targetClientId}`,
        email: clientData.email,
        name: adminData.targetClientName || clientData.name,
        role: 'manager' as UserRole,
        active: true,
        clientId: adminData.targetClientId,
        companyName: clientData.company_name || clientData.name
      };

      logger.auth('Usuário simulado de cliente criado', simulatedUser);
      setUser(simulatedUser);
      setIsLoading(false);
    } catch (error) {
      logger.error('auth', 'Erro ao simular login de cliente', error);
      setError('Erro ao simular acesso como cliente');
      setIsLoading(false);
    }
  }, []);

  // Função para simular login como fornecedor
  const simulateSupplierLogin = useCallback(async (adminData: any) => {
    logger.auth('Simulando login de fornecedor', adminData);
    setIsLoading(true);
    
    try {
      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', adminData.targetSupplierId)
        .single();

      if (supplierError || !supplierData) {
        logger.error('auth', 'Erro ao buscar dados do fornecedor', supplierError);
        setError('Fornecedor não encontrado');
        setIsLoading(false);
        return;
      }

      const simulatedUser: User = {
        id: `admin_simulated_${adminData.targetSupplierId}`,
        email: supplierData.email,
        name: adminData.targetSupplierName || supplierData.name,
        role: 'supplier' as UserRole,
        active: true,
        supplierId: adminData.targetSupplierId,
        companyName: supplierData.name
      };

      logger.auth('Usuário simulado de fornecedor criado', simulatedUser);
      setUser(simulatedUser);
      setIsLoading(false);
    } catch (error) {
      logger.error('auth', 'Erro ao simular login de fornecedor', error);
      setError('Erro ao simular acesso como fornecedor');
      setIsLoading(false);
    }
  }, []);

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
            logger.error('auth', 'Erro ao parsear admin data', error);
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
            logger.error('auth', 'Erro ao obter sessão inicial', error);
            setIsLoading(false);
            return;
          }
          
          logger.auth('Sessão inicial verificada', { hasSession: !!session, userId: session?.user?.id });
          
          setSession(session);
          if (session?.user) {
            fetchUserProfile(session.user);
          } else {
            setIsLoading(false);
          }
        } catch (error) {
          logger.error('auth', 'Erro ao inicializar auth', error);
          setIsLoading(false);
        }
      };

      initializeAuth();
    }

    // Listen for auth changes - otimizado para evitar reloads
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        logger.auth('Auth state change', { event, hasSession: !!newSession, userId: newSession?.user?.id });
        
        // NOVO: Detectar token refresh com falha (sessão inválida)
        if (event === 'TOKEN_REFRESHED' && !newSession) {
          logger.error('auth', 'Token refresh falhou - sessão inválida, limpando estado');
          setUser(null);
          setSession(null);
          setError('Sua sessão expirou. Por favor, faça login novamente.');
          setIsLoading(false);
          return;
        }
        
        // Ignorar eventos de token refresh se usuário não mudou
        if (event === 'TOKEN_REFRESHED' && newSession?.user?.id === user?.id) {
          logger.auth('Token refresh - mantendo estado');
          setSession(newSession); // Apenas atualizar sessão
          return;
        }
        
        // Ignorar eventos duplicados
        if (event === 'SIGNED_IN' && newSession?.user?.id === user?.id) {
          logger.auth('SIGNED_IN duplicado - ignorando');
          return;
        }
        
        setSession(newSession);
        
        if (newSession?.user) {
          fetchUserProfile(newSession.user);
        } else {
          logger.auth('Sem sessão - limpando estado');
          setUser(null);
          setError(null);
          setForcePasswordChange(false);
          setNeedsTermsAcceptance(false);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, simulateClientLogin, simulateSupplierLogin, user?.id]);

  const handlePasswordChanged = useCallback(() => {
    setForcePasswordChange(false);
    // Disparar evento para permitir o tour iniciar após a troca de senha
    window.dispatchEvent(new CustomEvent('password-changed'));
  }, []);

  const handleTermsAccepted = useCallback(async () => {
    logger.info('auth', '[TERMS] Callback de termos aceitos disparado');
    
    // Sincronização IMEDIATA do estado
    setNeedsTermsAcceptance(false);
    setUser(prevUser => prevUser ? { ...prevUser, termsAccepted: true } : null);
    
    logger.info('auth', '[TERMS] Modal fechado e estado sincronizado');
  }, []);

  // Listen for profile updates from settings
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

    const handleAvatarUpdate = (event: any) => {
      if (user && event.detail?.avatar_url) {
        setUser(prevUser => prevUser ? { ...prevUser, avatar: event.detail.avatar_url } : null);
      }
    };

    const handleProfileReload = () => {
      if (user?.id && session?.user) {
        fetchUserProfile(session.user);
      }
    };

    // NOVO: Listener para aceitação de termos
    const handleTermsAcceptedEvent = async () => {
      logger.info('auth', '[TERMS] Evento terms-accepted recebido - sincronizando imediatamente');
      
      // Sincronização IMEDIATA antes do re-fetch
      setUser(prevUser => prevUser ? { ...prevUser, termsAccepted: true } : null);
      setNeedsTermsAcceptance(false);
      
      // Re-fetch para confirmar com banco
      if (user?.id && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('terms_accepted')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUser(prevUser => prevUser ? { 
            ...prevUser, 
            termsAccepted: profile.terms_accepted ?? false 
          } : null);
        }
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    window.addEventListener('userAvatarUpdated', handleAvatarUpdate);
    window.addEventListener('user-profile-updated', handleProfileReload);
    window.addEventListener('terms-accepted', handleTermsAcceptedEvent);

    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
      window.removeEventListener('userAvatarUpdated', handleAvatarUpdate);
      window.removeEventListener('user-profile-updated', handleProfileReload);
      window.removeEventListener('terms-accepted', handleTermsAcceptedEvent);
    };
  }, [user?.id, session?.user, fetchUserProfile]);

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

  const value = useMemo(() => ({
    user,
    session,
    isLoading,
    error,
    logout,
    updateProfile,
    checkAdminMode,
  }), [user, session, isLoading, error, logout, updateProfile, checkAdminMode]);

  return (
    <AuthContext.Provider value={value}>
      {/* Prioridade 1: Modal de Termos de Uso (se não aceito) */}
      {needsTermsAcceptance && user && (
        <TermsOfUseModal
          open={needsTermsAcceptance}
          userId={user.id}
          onTermsAccepted={handleTermsAccepted}
        />
      )}
      
      {/* Prioridade 2: Modal de Troca de Senha (após aceitar termos) */}
      {!needsTermsAcceptance && forcePasswordChange && user && (
        <ForcePasswordChangeModal
          open={forcePasswordChange}
          userEmail={user.email}
          onPasswordChanged={handlePasswordChanged}
        />
      )}
      
      {/* Children sempre renderizados para manter hooks montados */}
      {children}
    </AuthContext.Provider>
  );
});

AuthProvider.displayName = 'AuthProvider';
