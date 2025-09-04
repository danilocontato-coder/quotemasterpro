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
import { OptimizedSkeleton } from '@/components/ui/optimized-components';

// Lazy loading de layouts principais
const MainLayout = lazy(() => import('@/components/layout/MainLayout'));
const SuperAdminLayout = lazy(() => import('@/components/layout/SuperAdminLayout'));
const SupplierLayout = lazy(() => import('@/components/layout/SupplierLayout'));

// Auth pages com lazy loading
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));

// Dashboard pages com lazy loading
const AdminDashboard = lazy(() => import('@/pages/dashboards/AdminDashboard'));
const SupportDashboard = lazy(() => import('@/pages/dashboards/SupportDashboard'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));

// Admin pages com lazy loading
const SuperAdminDashboard = lazy(() => import('@/pages/admin/SuperAdminDashboard'));
const AccountsManagement = lazy(() => import('@/pages/admin/AccountsManagement'));
const SystemSettings = lazy(() => import('@/pages/admin/SystemSettings'));
const ClientsManagement = lazy(() => import('@/pages/admin/ClientsManagement'));
const SuppliersManagement = lazy(() => import('@/pages/admin/SuppliersManagement'));
const PlansManagement = lazy(() => import('@/pages/admin/PlansManagement'));
const IntegrationsManagement = lazy(() => import('@/pages/admin/IntegrationsManagement'));
const WhatsAppTemplates = lazy(() => import('@/pages/admin/WhatsAppTemplates'));
const AuditLogs = lazy(() => import('@/pages/admin/AuditLogs'));

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
const Permissions = lazy(() => import('@/pages/Permissions'));
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
const SupplierDeliveries = lazy(() => import('@/pages/supplier/SupplierDeliveries'));
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
                  <Route index element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <Dashboard />
                    </Suspense>
                  } />
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
                  <Route index element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <Quotes />
                    </Suspense>
                  } />
                </Route>
                <Route path="/suppliers" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <Suppliers />
                    </Suspense>
                  } />
                </Route>
                <Route path="/products" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <Products />
                    </Suspense>
                  } />
                </Route>
                <Route path="/approvals" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <Approvals />
                    </Suspense>
                  } />
                </Route>
                <Route path="/approval-levels" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <ApprovalLevels />
                    </Suspense>
                  } />
                </Route>
                <Route path="/payments" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <Payments />
                    </Suspense>
                  } />
                </Route>
                <Route path="/users" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <Users />
                    </Suspense>
                  } />
                </Route>
                <Route path="/communication" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <Communication />
                    </Suspense>
                  } />
                </Route>
                <Route path="/notifications" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <Notifications />
                    </Suspense>
                  } />
                </Route>
                <Route path="/settings" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <Settings />
                    </Suspense>
                  } />
                </Route>
                <Route path="/permissions" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <Permissions />
                    </Suspense>
                  } />
                </Route>
                <Route path="/reports" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <Reports />
                    </Suspense>
                  } />
                </Route>

                {/* Admin routes - SuperAdmin Panel com lazy loading */}
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<OptimizedSkeleton lines={10} className="p-6" />}>
                      <SuperAdminLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route path="superadmin" element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <SuperAdminDashboard />
                    </Suspense>
                  } />
                  <Route path="clients" element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <ClientsManagement />
                    </Suspense>
                  } />
                  <Route path="suppliers" element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <SuppliersManagement />
                    </Suspense>
                  } />
                  <Route path="plans" element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <PlansManagement />
                    </Suspense>
                  } />
                  <Route path="integrations" element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <IntegrationsManagement />
                    </Suspense>
                  } />
                  <Route path="whatsapp-templates" element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <WhatsAppTemplates />
                    </Suspense>
                  } />
                  <Route path="accounts" element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <AccountsManagement />
                    </Suspense>
                  } />
                  <Route path="audit" element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <AuditLogs />
                    </Suspense>
                  } />
                  <Route path="settings" element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <SystemSettings />
                    </Suspense>
                  } />
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
                  <Route index element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <SupplierDashboard />
                    </Suspense>
                  } />
                  <Route path="quotes" element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <SupplierQuotes />
                    </Suspense>
                  } />
                  <Route path="products" element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <SupplierProducts />
                    </Suspense>
                  } />
                  <Route path="history" element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <SupplierHistory />
                    </Suspense>
                  } />
                  <Route path="financial" element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <SupplierFinancial />
                    </Suspense>
                  } />
                  <Route path="deliveries" element={
                    <Suspense fallback={<OptimizedSkeleton lines={5} className="p-4" />}>
                      <SupplierDeliveries />
                    </Suspense>
                  } />
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
