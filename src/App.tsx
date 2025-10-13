import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { BrandingProvider } from '@/contexts/BrandingContext';
import { GlobalNavigationProvider } from '@/hooks/useGlobalNavigationSetup';
import { AppWithProviders } from '@/components/layout/AppWithProviders';

// Carregar test helpers em desenvolvimento
if (import.meta.env.DEV) {
  import('./utils/testHelpers').catch(err => {
    console.error('Erro ao carregar test helpers:', err);
  });
}

// Query client otimizado
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 20 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 0,
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

function App() {
  // Sistema de log já disponível via systemLogger
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <BrandingProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <Router>
                  {/* GlobalNavigationProvider removido - integrado no AppWithProviders */}
                  <AppWithProviders />
                  
                  {/* Toast notifications */}
                  <Toaster />
                  <Sonner />
                </Router>
              </SubscriptionProvider>
            </AuthProvider>
          </BrandingProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;