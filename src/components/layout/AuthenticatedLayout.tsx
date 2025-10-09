import React, { useEffect, useRef, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from './MainLayout';
import { SupplierLayout } from './SupplierLayout';
import { SuperAdminLayout } from './SuperAdminLayout';
import { AdministradoraLayout } from './AdministradoraLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

export const AuthenticatedLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const mountTimeRef = useRef(Date.now());
  const renderCountRef = useRef(0);
  const [clientType, setClientType] = useState<string | null>(null);
  const [clientTypeLoading, setClientTypeLoading] = useState(true);
  
  const debug = (msg: string, data?: any) => {
    if (typeof window !== 'undefined' && (window as any).__DEBUG__) {
      console.log(msg, data);
    }
  };

  renderCountRef.current++;
  
  debug('🔍 [DEBUG-AUTH-LAYOUT] AuthenticatedLayout render:', {
    renderCount: renderCountRef.current,
    isLoading,
    userId: user?.id,
    userRole: user?.role,
    timeSinceMount: Date.now() - mountTimeRef.current,
    timestamp: new Date().toISOString()
  });
  
  useEffect(() => {
    debug('🔍 [DEBUG-AUTH-LAYOUT] AuthenticatedLayout mounted');
    return () => {
      debug('🔍 [DEBUG-AUTH-LAYOUT] AuthenticatedLayout unmounting after:', Date.now() - mountTimeRef.current + ' ms');
    };
  }, []);

  useEffect(() => {
    const fetchClientType = async () => {
      if (!user || user.role === 'admin' || user.role === 'super_admin' || user.role === 'supplier') {
        setClientTypeLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('id', user.id)
          .single();

        if (profile?.client_id) {
          const { data: client } = await supabase
            .from('clients')
            .select('client_type')
            .eq('id', profile.client_id)
            .single();

          setClientType(client?.client_type || 'direct');
        }
      } catch (error) {
        console.error('Erro ao buscar tipo de cliente:', error);
      } finally {
        setClientTypeLoading(false);
      }
    };

    fetchClientType();
  }, [user]);

  if (isLoading || clientTypeLoading) {
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
    case 'super_admin':
      return <SuperAdminLayout />;
    case 'supplier':
      return <SupplierLayout />;
    case 'manager':
    case 'collaborator':
    case 'client':
      // Verificar se é administradora
      if (clientType === 'administradora') {
        return <AdministradoraLayout />;
      }
      return <MainLayout />;
    case 'support':
    default:
      return <MainLayout />;
  }
};