import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleBasedRedirect } from '@/components/layout/RoleBasedRedirect';
import { OptimizedSkeleton } from '@/components/ui/optimized-components';
import { usePerformanceMonitor } from '@/hooks/usePerformanceOptimization';

// Lazy loading de layouts principais
const MainLayout = lazy(() => import('@/components/layout/MainLayout').then(m => ({ default: m.MainLayout })));
const SuperAdminLayout = lazy(() => import('@/components/layout/SuperAdminLayout'));
const SupplierLayout = lazy(() => import('@/components/layout/SupplierLayout').then(m => ({ default: m.SupplierLayout })));

// Auth pages com lazy loading
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));

// Dashboard pages com lazy loading
const AdminDashboard = lazy(() => import('@/pages/dashboards/AdminDashboard'));
const SupportDashboard = lazy(() => import('@/pages/dashboards/SupportDashboard'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));

// Admin pages com lazy loading
const SuperAdminDashboard = lazy(() => import('@/pages/admin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const AccountsManagement = lazy(() => import('@/pages/admin/AccountsManagement').then(m => ({ default: m.AccountsManagement })));
const SystemSettings = lazy(() => import('@/pages/admin/SystemSettings').then(m => ({ default: m.SystemSettings })));
const ClientsManagement = lazy(() => import('@/pages/admin/ClientsManagement').then(m => ({ default: m.ClientsManagement })));
const SuppliersManagement = lazy(() => import('@/pages/admin/SuppliersManagement').then(m => ({ default: m.SuppliersManagement })));
const PlansManagement = lazy(() => import('@/pages/admin/PlansManagement').then(m => ({ default: m.PlansManagement })));
const IntegrationsManagement = lazy(() => import('@/pages/admin/IntegrationsManagement').then(m => ({ default: m.IntegrationsManagement })));
const WhatsAppTemplates = lazy(() => import('@/pages/admin/WhatsAppTemplates'));
const AuditLogs = lazy(() => import('@/pages/admin/AuditLogs').then(m => ({ default: m.AuditLogs })));

// Páginas principais com lazy loading
const Quotes = lazy(() => import('@/pages/Quotes'));
const Suppliers = lazy(() => import('@/pages/Suppliers'));
const Products = lazy(() => import('@/pages/Products'));
const Payments = lazy(() => import('@/pages/Payments'));
const Reports = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Reports })));
const Approvals = lazy(() => import('@/pages/Approvals').then(m => ({ default: m.Approvals })));
const ApprovalLevels = lazy(() => import('@/pages/ApprovalLevels').then(m => ({ default: m.ApprovalLevels })));
const Users = lazy(() => import('@/pages/Users'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Profiles = lazy(() => import('@/pages/Profiles').then(m => ({ default: m.Profiles })));
const Permissions = lazy(() => import('@/pages/Permissions').then(m => ({ default: m.Permissions })));
const Communication = lazy(() => import('@/pages/Communication'));
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));
const AdminSuppliers = lazy(() => import('@/pages/AdminSuppliers'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Supplier pages com lazy loading
const SupplierDashboard = lazy(() => import('@/pages/supplier/SupplierDashboard'));
const SupplierQuotes = lazy(() => import('@/pages/supplier/SupplierQuotes'));
const SupplierProducts = lazy(() => import('@/pages/supplier/SupplierProducts'));
const SupplierFinancial = lazy(() => import('@/pages/supplier/SupplierFinancial'));
const SupplierHistory = lazy(() => import('@/pages/supplier/SupplierHistory'));
const SupplierAuth = lazy(() => import('@/pages/supplier/SupplierAuth'));
const SupplierQuoteResponse = lazy(() => import('@/pages/supplier/SupplierQuoteResponse'));
const SupplierResponseSuccess = lazy(() => import('@/pages/supplier/SupplierResponseSuccess'));

// Query client otimizado para performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
      refetchOnWindowFocus: false,
      retry: 1,
      refetchOnMount: false
    }
  }
});

function App() {
  // Monitor de performance global
  usePerformanceMonitor();
  
  // Optimized system performance and prevent unwanted refreshes
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only log visibility changes, don't force reloads
      if (!document.hidden) {
        console.debug('Tab became visible - maintaining state');
      }
    };

    // Optimized beforeunload handler
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const hasUnsavedForms = document.querySelector('form:not([data-saved="true"])') ||
                             document.querySelector('[data-dirty="true"]');
      
      if (hasUnsavedForms) {
        event.preventDefault();
        return 'Você tem alterações não salvas. Deseja realmente sair?';
      }
    };

    // Use passive listeners for better performance
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <Router>
              <Routes>
                {/* Auth routes com lazy loading */}
                <Route path="/auth/login" element={
                  <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                    <Login />
                  </Suspense>
                } />
                <Route path="/auth/register" element={
                  <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                    <Register />
                  </Suspense>
                } />
                <Route path="/auth/forgot-password" element={
                  <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                    <ForgotPassword />
                  </Suspense>
                } />
                
                {/* Public routes */}
                <Route path="/" element={<RoleBasedRedirect />} />
                
                {/* Dashboard routes - organized as nested routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="quotes" element={<Navigate to="/quotes" replace />} />
                  <Route path="suppliers" element={<Navigate to="/suppliers" replace />} />
                  <Route path="products" element={<Navigate to="/products" replace />} />
                  <Route path="approvals" element={<Navigate to="/approvals" replace />} />
                  <Route path="payments" element={<Navigate to="/payments" replace />} />
                  <Route path="users" element={<Navigate to="/users" replace />} />
                  <Route path="communication" element={<Navigate to="/communication" replace />} />
                  <Route path="notifications" element={<Navigate to="/notifications" replace />} />
                  <Route path="settings" element={<Navigate to="/settings" replace />} />
                  <Route path="permissions" element={<Navigate to="/permissions" replace />} />
                  <Route path="reports" element={<Navigate to="/reports" replace />} />
                </Route>
                
                {/* Main application routes com lazy loading */}
                <Route path="/quotes" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={<Quotes />} />
                </Route>
                <Route path="/suppliers" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={<Suppliers />} />
                </Route>
                <Route path="/products" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={<Products />} />
                </Route>
                <Route path="/approvals" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={<Approvals />} />
                </Route>
                <Route path="/approval-levels" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={<ApprovalLevels />} />
                </Route>
                <Route path="/payments" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={<Payments />} />
                </Route>
                <Route path="/users" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={<Users />} />
                </Route>
                <Route path="/communication" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={<Communication />} />
                </Route>
                <Route path="/notifications" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={<Notifications />} />
                </Route>
                <Route path="/settings" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={<Settings />} />
                </Route>
                <Route path="/permissions" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={<Permissions />} />
                </Route>
                <Route path="/reports" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={<Reports />} />
                </Route>

                {/* Admin routes - SuperAdmin Panel com lazy loading */}
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <SuperAdminLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route path="superadmin" element={<SuperAdminDashboard />} />
                  <Route path="clients" element={<ClientsManagement />} />
                  <Route path="suppliers" element={<SuppliersManagement />} />
                  <Route path="plans" element={<PlansManagement />} />
                  <Route path="integrations" element={<IntegrationsManagement />} />
                  <Route path="whatsapp-templates" element={<WhatsAppTemplates />} />
                  <Route path="accounts" element={<AccountsManagement />} />
                  <Route path="audit" element={<AuditLogs />} />
                  <Route path="settings" element={<SystemSettings />} />
                  <Route index element={<Navigate to="/admin/superadmin" replace />} />
                </Route>

                {/* Supplier routes */}
                <Route path="/supplier" element={
                  <ProtectedRoute allowedRoles={['supplier']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <SupplierLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={<SupplierDashboard />} />
                  <Route path="quotes" element={<SupplierQuotes />} />
                  <Route path="products" element={<SupplierProducts />} />
                  <Route path="history" element={<SupplierHistory />} />
                  <Route path="financial" element={<SupplierFinancial />} />
                </Route>

                {/* Support routes */}
                <Route path="/support" element={
                  <ProtectedRoute allowedRoles={['support']}>
                    <SupportDashboard />
                  </ProtectedRoute>
                } />

                {/* Supplier Public Routes */}
                <Route path="/supplier/auth/:quoteId/:token" element={<SupplierAuth />} />
                <Route path="/supplier/quote/:quoteId/response/:token" element={<SupplierQuoteResponse />} />
                <Route path="/supplier/response-success" element={<SupplierResponseSuccess />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
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
