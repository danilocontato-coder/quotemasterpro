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
import { TourProvider } from '@/components/tour/TourProvider';
import { useVersionChecker } from '@/hooks/useVersionChecker';
import '@/styles/tour-custom.css';

if (import.meta.env.DEV) {
  import('./utils/testHelpers').catch(err => {
    console.error('Erro ao carregar test helpers:', err);
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,     // ✅ Reduzir para 2 minutos
      gcTime: 5 * 60 * 1000,        // ✅ Reduzir para 5 minutos
      refetchOnWindowFocus: true,   // ✅ Revalidar ao focar janela
      refetchOnMount: 'always',     // ✅ Sempre buscar ao montar
      retry: 1,
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

function App() {
  // ✅ Checar atualizações automaticamente
  useVersionChecker();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <BrandingProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <TourProvider>
                  <Router>
                    <GlobalNavigationProvider />
                    <AppWithProviders />
                    <Toaster />
                    <Sonner />
                  </Router>
                </TourProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </BrandingProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
