import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleBasedRedirect } from '@/components/layout/RoleBasedRedirect';
import { MainLayout } from '@/components/layout/MainLayout';
import { SupplierLayout } from '@/components/layout/SupplierLayout';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';

// Import static for critical pages
import Dashboard from '@/pages/Dashboard';

// Lazy loading for other pages
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const Quotes = lazy(() => import('@/pages/Quotes'));
const Suppliers = lazy(() => import('@/pages/Suppliers'));
const Products = lazy(() => import('@/pages/Products'));
const Approvals = lazy(() => import('@/pages/Approvals').then(m => ({ default: m.Approvals })));
const Payments = lazy(() => import('@/pages/Payments'));
const Users = lazy(() => import('@/pages/Users'));
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));
const SuperAdminDashboard = lazy(() => import('@/pages/admin/SuperAdminDashboard'));
const ClientsManagement = lazy(() => import('@/pages/admin/ClientsManagement'));
const SupplierAuth = lazy(() => import('@/pages/supplier/SupplierAuth'));
const SupplierDashboard = lazy(() => import('@/pages/supplier/SupplierDashboard'));
const SupplierQuotes = lazy(() => import('@/pages/supplier/SupplierQuotes'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Query client simplified
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <Router>
              <Routes>
                {/* Public Routes */}
                <Route path="/auth/login" element={
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
                    <Login />
                  </Suspense>
                } />
                
                <Route path="/auth/register" element={
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
                    <Register />
                  </Suspense>
                } />
                
                <Route path="/auth/forgot-password" element={
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
                    <ForgotPassword />
                  </Suspense>
                } />

                {/* Supplier Public Routes */}
                <Route path="/supplier/auth/:quoteId/:token" element={
                  <Suspense fallback={<div>Carregando...</div>}>
                    <SupplierAuth />
                  </Suspense>
                } />

                {/* Root redirect */}
                <Route path="/" element={<RoleBasedRedirect />} />

                {/* Admin Routes */}
                <Route path="/admin/*" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SuperAdminLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<div>Carregando...</div>}>
                      <SuperAdminDashboard />
                    </Suspense>
                  } />
                  <Route path="clients" element={
                    <Suspense fallback={<div>Carregando...</div>}>
                      <ClientsManagement />
                    </Suspense>
                  } />
                </Route>

                {/* Supplier Routes */}
                <Route path="/supplier/*" element={
                  <ProtectedRoute allowedRoles={['supplier']}>
                    <SupplierLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Navigate to="/supplier/dashboard" replace />} />
                  <Route path="dashboard" element={
                    <Suspense fallback={<div>Carregando...</div>}>
                      <SupplierDashboard />
                    </Suspense>
                  } />
                  <Route path="quotes" element={
                    <Suspense fallback={<div>Carregando...</div>}>
                      <SupplierQuotes />
                    </Suspense>
                  } />
                </Route>

                {/* Client/Manager Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute allowedRoles={['client', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                </Route>

                <Route path="/quotes" element={
                  <ProtectedRoute allowedRoles={['client', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<div>Carregando...</div>}>
                      <Quotes />
                    </Suspense>
                  } />
                </Route>

                <Route path="/suppliers" element={
                  <ProtectedRoute allowedRoles={['client', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<div>Carregando...</div>}>
                      <Suppliers />
                    </Suspense>
                  } />
                </Route>

                <Route path="/products" element={
                  <ProtectedRoute allowedRoles={['client', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<div>Carregando...</div>}>
                      <Products />
                    </Suspense>
                  } />
                </Route>

                <Route path="/approvals" element={
                  <ProtectedRoute allowedRoles={['client', 'manager']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<div>Carregando...</div>}>
                      <Approvals />
                    </Suspense>
                  } />
                </Route>

                <Route path="/payments" element={
                  <ProtectedRoute allowedRoles={['client', 'manager']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<div>Carregando...</div>}>
                      <Payments />
                    </Suspense>
                  } />
                </Route>

                <Route path="/users" element={
                  <ProtectedRoute allowedRoles={['client', 'manager']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<div>Carregando...</div>}>
                      <Users />
                    </Suspense>
                  } />
                </Route>

                <Route path="/settings" element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<div>Carregando...</div>}>
                      <Settings />
                    </Suspense>
                  } />
                </Route>

                {/* 404 */}
                <Route path="*" element={
                  <Suspense fallback={<div>Carregando...</div>}>
                    <NotFound />
                  </Suspense>
                } />
              </Routes>
              <Toaster />
              <Sonner />
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;