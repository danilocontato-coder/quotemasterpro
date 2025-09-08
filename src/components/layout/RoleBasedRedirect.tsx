import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleBasedRoute } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export const RoleBasedRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  const mountTimeRef = useRef(Date.now());
  const renderCountRef = useRef(0);
  
  renderCountRef.current++;

  // Simplified logging to prevent spam
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [REDIRECT] Component mounted');
    }
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [REDIRECT] Component unmounted after:', Date.now() - mountTimeRef.current + 'ms');
      }
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
    return <Navigate to="/auth/login" replace />;
  }

  const targetRoute = getRoleBasedRoute(user.role);
  return <Navigate to={targetRoute} replace />;
};