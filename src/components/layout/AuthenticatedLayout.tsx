import React, { useEffect, useRef } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from './MainLayout';
import { SupplierLayout } from './SupplierLayout';
import { SuperAdminLayout } from './SuperAdminLayout';
import { Skeleton } from '@/components/ui/skeleton';

export const AuthenticatedLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const mountTimeRef = useRef(Date.now());
  const renderCountRef = useRef(0);
  
  renderCountRef.current++;
  
  console.log('🔍 [DEBUG-AUTH-LAYOUT] AuthenticatedLayout render:', {
    renderCount: renderCountRef.current,
    isLoading,
    userId: user?.id,
    userRole: user?.role,
    timeSinceMount: Date.now() - mountTimeRef.current,
    timestamp: new Date().toISOString()
  });
  
  useEffect(() => {
    console.log('🔍 [DEBUG-AUTH-LAYOUT] AuthenticatedLayout mounted');
    return () => {
      console.log('🔍 [DEBUG-AUTH-LAYOUT] AuthenticatedLayout unmounting after:', Date.now() - mountTimeRef.current, 'ms');
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

  // Determine which layout to use based on user role
  switch (user.role) {
    case 'admin':
      return <SuperAdminLayout />;
    case 'supplier':
      return <SupplierLayout />;
    case 'manager':
    case 'collaborator':
    case 'client':
    case 'support':
    default:
      return <MainLayout />;
  }
};