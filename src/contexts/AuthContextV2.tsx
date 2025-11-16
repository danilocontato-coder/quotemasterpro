/**
 * AuthContextV2 - Nova versão modular do AuthContext
 * 
 * IMPORTANTE: Esta é uma implementação paralela ao AuthContext.tsx atual.
 * Use a variável VITE_USE_AUTH_V2=true no .env para ativar esta versão.
 * 
 * Arquitetura modular:
 * - AuthCore: Estado e lógica principal
 * - AuthModals: Modais de senha e termos
 * - AuthNavigation: Navegação baseada em role
 * - AuthSimulation: Simulação de login admin
 */

import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/systemLogger';
import { Loader2 } from 'lucide-react';
import { AuthContext, useAuthCore } from './auth/AuthCore';
import { useAuthModals } from './auth/AuthModals';
import { useAuthSimulation } from './auth/AuthSimulation';

export { useAuth } from './auth/AuthCore';
export { getRoleBasedRoute } from './auth/AuthNavigation';
export type { User, UserRole, AuthContextType } from './auth/AuthCore';

export const AuthProviderV2: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const {
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
  } = useAuthCore();

  const {
    forcePasswordChange,
    setForcePasswordChange,
    needsTermsAcceptance,
    setNeedsTermsAcceptance,
    AuthModalsRenderer,
  } = useAuthModals(user, setUser);

  const { checkAdminToken } = useAuthSimulation(setUser, setIsLoading, setError);

  // Initialize auth state
  useEffect(() => {
    logger.auth('Inicializando AuthContextV2');
    
    // Check for admin simulation token first
    const hasAdminToken = checkAdminToken();
    if (hasAdminToken) {
      logger.auth('Admin token detectado, usando login simulado');
      return;
    }

    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        
        logger.auth('Auth state changed', { event });
        
        setSession(currentSession);
        
        if (currentSession?.user && event !== 'SIGNED_OUT') {
          await fetchUserProfile(currentSession.user);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      
      setSession(currentSession);
      
      if (currentSession?.user) {
        fetchUserProfile(currentSession.user);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkAdminToken, fetchUserProfile, setSession, setUser, setIsLoading]);

  // Check for force password change and terms acceptance
  useEffect(() => {
    if (user && !checkAdminMode()) {
      if (user.forcePasswordChange) {
        setForcePasswordChange(true);
      }
      
      if (!user.termsAccepted) {
        setNeedsTermsAcceptance(true);
      }
    }
  }, [user, checkAdminMode, setForcePasswordChange, setNeedsTermsAcceptance]);

  const value = {
    user,
    session,
    isLoading,
    error,
    logout,
    updateProfile,
    checkAdminMode,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModalsRenderer />
    </AuthContext.Provider>
  );
});

AuthProviderV2.displayName = 'AuthProviderV2';
