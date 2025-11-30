import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleBasedRoute } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export const RoleBasedRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  const mountTimeRef = useRef(Date.now());
  const renderCountRef = useRef(0);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  const debug = (msg: string, data?: any) => {
    if (typeof window !== 'undefined' && (window as any).__DEBUG__) {
      console.log(msg, data);
    }
  };

  renderCountRef.current++;
  
  debug('🔍 [DEBUG-REDIRECT] RoleBasedRedirect render:', {
    renderCount: renderCountRef.current,
    isLoading,
    userId: user?.id,
    userRole: user?.role,
    timeSinceMount: Date.now() - mountTimeRef.current,
    timestamp: new Date().toISOString()
  });
  
  useEffect(() => {
    debug('🔍 [DEBUG-REDIRECT] RoleBasedRedirect mounted');
    return () => {
      debug('🔍 [DEBUG-REDIRECT] RoleBasedRedirect unmounting after:', Date.now() - mountTimeRef.current + ' ms');
    };
  }, []);

  // NOVO: Timeout de 10 segundos para evitar loading infinito
  useEffect(() => {
    if (!isLoading) return;
    
    const timer = setTimeout(() => {
      debug('🔍 [DEBUG-REDIRECT] Loading timeout atingido');
      setLoadingTimeout(true);
    }, 10000); // 10 segundos

    return () => clearTimeout(timer);
  }, [isLoading]);

  // NOVO: Mostrar erro se timeout for atingido
  if (loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8 max-w-md">
          <div className="text-destructive text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-foreground">Erro ao carregar informações</h2>
          <p className="text-muted-foreground">
            Sua sessão pode ter expirado ou há um problema de conexão.
          </p>
          <Button 
            onClick={() => window.location.href = '/auth/login'}
            className="mt-4"
          >
            Fazer login novamente
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  if (!user) {
    debug('🔍 [DEBUG-REDIRECT] No user - redirecting to login');
    return <Navigate to="/auth/login" replace />;
  }

  // Verificar se há URL de redirecionamento guardada
  const redirectPath = sessionStorage.getItem('redirectAfterLogin');
  if (redirectPath) {
    debug('🔍 [DEBUG-REDIRECT] Found redirect path:', redirectPath);
    sessionStorage.removeItem('redirectAfterLogin');
    return <Navigate to={redirectPath} replace />;
  }

  const targetRoute = getRoleBasedRoute(user.role, { 
    supplierId: user.supplierId, 
    clientId: user.clientId,
    clientType: user.clientType 
  });
  debug('🔍 [DEBUG-REDIRECT] Redirecting to:', { targetRoute, role: user.role, supplierId: user.supplierId, clientId: user.clientId, clientType: user.clientType });
  return <Navigate to={targetRoute} replace />;
};