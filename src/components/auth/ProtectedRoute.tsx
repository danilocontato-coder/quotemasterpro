import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useAuthTenant } from '@/hooks/useAuthTenant';
import { TenantOnboarding } from '@/components/auth/TenantOnboarding';
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
  const { needsOnboarding, isLoading: tenantLoading, isReady } = useAuthTenant();
  const [showOnboarding, setShowOnboarding] = useState(false);
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

  // Check if user needs onboarding (tenant binding)
  if (needsOnboarding) {
    // Auto-show onboarding if not shown yet
    if (!showOnboarding) {
      setShowOnboarding(true);
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <TenantOnboarding 
          open={showOnboarding} 
          onOpenChange={setShowOnboarding}
        />
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold">Configuração da Conta</h2>
          <p className="text-muted-foreground">
            Configurando sua conta para acesso à plataforma...
          </p>
        </div>
      </div>
    );
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