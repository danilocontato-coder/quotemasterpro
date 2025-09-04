import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleBasedRedirect } from '@/components/layout/RoleBasedRedirect';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Loading componente simples
const Loading = ({ lines = 5 }: { lines?: number }) => (
  <div className="p-6 space-y-4">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
    ))}
  </div>
);

// Lazy loading components
const MainLayout = lazy(() => import('@/components/layout/MainLayout'));
const SuperAdminLayout = lazy(() => import('@/components/layout/SuperAdminLayout'));
const SupplierLayout = lazy(() => import('@/components/layout/SupplierLayout'));

// Auth pages
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));

// Main pages
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Quotes = lazy(() => import('@/pages/Quotes'));
const Suppliers = lazy(() => import('@/pages/Suppliers'));
const Products = lazy(() => import('@/pages/Products'));
const Users = lazy(() => import('@/pages/Users'));
const Approvals = lazy(() => import('@/pages/Approvals'));
const Payments = lazy(() => import('@/pages/Payments'));
const Settings = lazy(() => import('@/pages/Settings'));
const Communication = lazy(() => import('@/pages/Communication'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Permissions = lazy(() => import('@/pages/Permissions'));
const ApprovalLevels = lazy(() => import('@/pages/ApprovalLevels'));
const Reports = lazy(() => import('@/pages/Reports'));
const Profiles = lazy(() => import('@/pages/Profiles'));

// Admin pages
const SuperAdminDashboard = lazy(() => import('@/pages/admin/SuperAdminDashboard'));
const ClientsManagement = lazy(() => import('@/pages/admin/ClientsManagement'));
const SuppliersManagement = lazy(() => import('@/pages/admin/SuppliersManagement'));
const PlansManagement = lazy(() => import('@/pages/admin/PlansManagement'));
const AccountsManagement = lazy(() => import('@/pages/admin/AccountsManagement'));
const IntegrationsManagement = lazy(() => import('@/pages/admin/IntegrationsManagement'));
const SystemSettings = lazy(() => import('@/pages/admin/SystemSettings'));
const AuditLogs = lazy(() => import('@/pages/admin/AuditLogs'));
const WhatsAppTemplates = lazy(() => import('@/pages/admin/WhatsAppTemplates'));

// Supplier pages
const SupplierAuth = lazy(() => import('@/pages/supplier/SupplierAuth'));
const SupplierDashboard = lazy(() => import('@/pages/supplier/SupplierDashboard'));
const SupplierQuotes = lazy(() => import('@/pages/supplier/SupplierQuotes'));
const SupplierProducts = lazy(() => import('@/pages/supplier/SupplierProducts'));
const SupplierFinancial = lazy(() => import('@/pages/supplier/SupplierFinancial'));
const SupplierHistory = lazy(() => import('@/pages/supplier/SupplierHistory'));
const SupplierQuoteResponse = lazy(() => import('@/pages/supplier/SupplierQuoteResponse'));
const SupplierResponseSuccess = lazy(() => import('@/pages/supplier/SupplierResponseSuccess'));
const SupplierDeliveries = lazy(() => import('@/pages/supplier/SupplierDeliveries'));

// Support e NotFound
const SupportDashboard = lazy(() => import('@/pages/dashboards/SupportDashboard'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// QueryClient configurado
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
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
                {/* Auth routes */}
                <Route path="/auth/login" element={
                  <Suspense fallback={<Loading lines={10} />}>
                    <Login />
                  </Suspense>
                } />
                <Route path="/auth/register" element={
                  <Suspense fallback={<Loading lines={10} />}>
                    <Register />
                  </Suspense>
                } />
                <Route path="/auth/forgot-password" element={
                  <Suspense fallback={<Loading lines={10} />}>
                    <ForgotPassword />
                  </Suspense>
                } />
                
                {/* Public routes */}
                <Route path="/" element={<RoleBasedRedirect />} />
                
                {/* Dashboard routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<Loading lines={10} />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<Loading lines={5} />}>
                      <Dashboard />
                    </Suspense>
                  } />
                </Route>

                {/* Main content routes */}
                <Route path="/quotes" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<Loading lines={10} />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <Quotes />
                    </Suspense>
                  } />
                </Route>

                <Route path="/suppliers" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<Loading lines={10} />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <Suppliers />
                    </Suspense>
                  } />
                </Route>

                <Route path="/products" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<Loading lines={10} />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <Products />
                    </Suspense>
                  } />
                </Route>

                <Route path="/users" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <Suspense fallback={<Loading lines={10} />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <Users />
                    </Suspense>
                  } />
                </Route>

                <Route path="/approvals" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager']}>
                    <Suspense fallback={<Loading lines={10} />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <Approvals />
                    </Suspense>
                  } />
                </Route>

                <Route path="/approval-levels" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <Suspense fallback={<Loading lines={10} />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <ApprovalLevels />
                    </Suspense>
                  } />
                </Route>

                <Route path="/payments" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager']}>
                    <Suspense fallback={<Loading lines={10} />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <Payments />
                    </Suspense>
                  } />
                </Route>

                <Route path="/settings" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<Loading lines={10} />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <Settings />
                    </Suspense>
                  } />
                </Route>

                <Route path="/communication" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<Loading lines={10} />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <Communication />
                    </Suspense>
                  } />
                </Route>

                <Route path="/notifications" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <Suspense fallback={<Loading lines={10} />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <Notifications />
                    </Suspense>
                  } />
                </Route>

                <Route path="/permissions" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <Suspense fallback={<Loading lines={10} />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <Permissions />
                    </Suspense>
                  } />
                </Route>

                <Route path="/reports" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <Suspense fallback={<Loading lines={10} />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <Reports />
                    </Suspense>
                  } />
                </Route>

                <Route path="/profiles" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <Suspense fallback={<Loading lines={10} />}>
                      <MainLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <Profiles />
                    </Suspense>
                  } />
                </Route>

                {/* Admin routes */}
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<Loading lines={10} />}>
                      <SuperAdminLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <SuperAdminDashboard />
                    </Suspense>
                  } />
                  <Route path="clients" element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <ClientsManagement />
                    </Suspense>
                  } />
                  <Route path="suppliers" element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <SuppliersManagement />
                    </Suspense>
                  } />
                  <Route path="plans" element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <PlansManagement />
                    </Suspense>
                  } />
                  <Route path="accounts" element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <AccountsManagement />
                    </Suspense>
                  } />
                  <Route path="integrations" element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <IntegrationsManagement />
                    </Suspense>
                  } />
                  <Route path="settings" element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <SystemSettings />
                    </Suspense>
                  } />
                  <Route path="audit" element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <AuditLogs />
                    </Suspense>
                  } />
                  <Route path="whatsapp-templates" element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <WhatsAppTemplates />
                    </Suspense>
                  } />
                </Route>

                {/* Supplier routes */}
                <Route path="/supplier-auth" element={
                  <Suspense fallback={<Loading lines={10} />}>
                    <SupplierAuth />
                  </Suspense>
                } />

                <Route path="/supplier" element={
                  <Suspense fallback={<Loading lines={10} />}>
                    <SupplierLayout />
                  </Suspense>
                }>
                  <Route index element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <SupplierDashboard />
                    </Suspense>
                  } />
                  <Route path="dashboard" element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <SupplierDashboard />
                    </Suspense>
                  } />
                  <Route path="quotes" element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <SupplierQuotes />
                    </Suspense>
                  } />
                  <Route path="products" element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <SupplierProducts />
                    </Suspense>
                  } />
                  <Route path="financial" element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <SupplierFinancial />
                    </Suspense>
                  } />
                  <Route path="history" element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <SupplierHistory />
                    </Suspense>
                  } />
                  <Route path="deliveries" element={
                    <Suspense fallback={<Loading lines={8} />}>
                      <SupplierDeliveries />
                    </Suspense>
                  } />
                </Route>

                {/* Supplier quote response */}
                <Route path="/supplier/quote/:quoteId" element={
                  <Suspense fallback={<Loading lines={10} />}>
                    <SupplierQuoteResponse />
                  </Suspense>
                } />
                <Route path="/supplier/response-success" element={
                  <Suspense fallback={<Loading lines={8} />}>
                    <SupplierResponseSuccess />
                  </Suspense>
                } />

                {/* Support dashboard */}
                <Route path="/support" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<Loading lines={8} />}>
                      <SupportDashboard />
                    </Suspense>
                  </ProtectedRoute>
                } />

                {/* 404 */}
                <Route path="*" element={
                  <Suspense fallback={<Loading lines={5} />}>
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