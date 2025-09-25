import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useAuthTenant } from '@/hooks/useAuthTenant';

import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/auth/login'
}) => {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: tenantLoading } = useAuthTenant();
  
  const location = useLocation();

  // Loading states
  if (authLoading || tenantLoading) {
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

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }


  // Check role-based access
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirecionar para dashboard apropriado baseado no role
    const dashboardMap: Record<string, string> = {
      admin: '/admin/superadmin',
      client: '/dashboard',
      supplier: '/supplier',
      support: '/support'
    };
    
    return <Navigate to={dashboardMap[user.role] || '/dashboard'} replace />;
  }

  // All checks passed, render children
  return <>{children}</>;
};