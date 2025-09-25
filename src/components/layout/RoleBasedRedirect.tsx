import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleBasedRoute } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export const RoleBasedRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  const mountTimeRef = useRef(Date.now());
  const renderCountRef = useRef(0);
  
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

  const targetRoute = getRoleBasedRoute(user.role, { supplierId: user.supplierId, clientId: user.clientId });
  debug('🔍 [DEBUG-REDIRECT] Redirecting to:', { targetRoute, role: user.role, supplierId: user.supplierId, clientId: user.clientId });
  return <Navigate to={targetRoute} replace />;
};