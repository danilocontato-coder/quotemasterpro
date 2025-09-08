import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { MainLayout } from './MainLayout';
import { SuperAdminLayout } from './SuperAdminLayout';
import { SupplierLayout } from './SupplierLayout';

// Páginas lazy
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Quotes = lazy(() => import('@/pages/Quotes'));
const Suppliers = lazy(() => import('@/pages/Suppliers'));
const Products = lazy(() => import('@/pages/Products'));
const SuperAdminDashboard = lazy(() => import('@/pages/admin/SuperAdminDashboard'));
const SupplierDashboard = lazy(() => import('@/pages/supplier/SupplierDashboard'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const AuthenticatedApp: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Loading state
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

  // Não autenticado - redirecionar para login
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Redirecionar para dashboard baseado no role
  const getDefaultRoute = () => {
    switch (user.role) {
      case 'admin':
        return '/app/admin';
      case 'supplier': 
        return '/app/supplier';
      default:
        return '/app/dashboard';
    }
  };

  return (
    <Routes>
      {/* Root do app - redireciona para dashboard apropriado */}
      <Route index element={<Navigate to={getDefaultRoute()} replace />} />

      {/* Rotas do Admin */}
      {user.role === 'admin' && (
        <Route path="/admin/*" element={<SuperAdminLayout />}>
          <Route index element={
            <Suspense fallback={<div>Carregando...</div>}>
              <SuperAdminDashboard />
            </Suspense>
          } />
        </Route>
      )}

      {/* Rotas do Supplier */}
      {user.role === 'supplier' && (
        <Route path="/supplier/*" element={<SupplierLayout />}>
          <Route index element={
            <Suspense fallback={<div>Carregando...</div>}>
              <SupplierDashboard />
            </Suspense>
          } />
        </Route>
      )}

      {/* Rotas do Cliente/Manager/Collaborator */}
      {['client', 'manager', 'collaborator'].includes(user.role) && (
        <>
          <Route path="/dashboard" element={<MainLayout />}>
            <Route index element={
              <Suspense fallback={<div>Carregando...</div>}>
                <Dashboard />
              </Suspense>
            } />
          </Route>

          <Route path="/quotes" element={<MainLayout />}>
            <Route index element={
              <Suspense fallback={<div>Carregando...</div>}>
                <Quotes />
              </Suspense>
            } />
          </Route>

          <Route path="/suppliers" element={<MainLayout />}>
            <Route index element={
              <Suspense fallback={<div>Carregando...</div>}>
                <Suppliers />
              </Suspense>
            } />
          </Route>

          <Route path="/products" element={<MainLayout />}>
            <Route index element={
              <Suspense fallback={<div>Carregando...</div>}>
                <Products />
              </Suspense>
            } />
          </Route>
        </>
      )}

      {/* 404 dentro do app */}
      <Route path="*" element={
        <Suspense fallback={<div>Carregando...</div>}>
          <NotFound />
        </Suspense>
      } />
    </Routes>
  );
};

export default AuthenticatedApp;