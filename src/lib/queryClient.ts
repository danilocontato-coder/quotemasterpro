import { QueryClient } from '@tanstack/react-query';

/**
 * Cliente React Query otimizado para reduzir consumo de API
 * - Cache agressivo: 5 minutos staleTime, 10 minutos gcTime
 * - Desabilita refetch automático em foco/mount
 * - Retry limitado a 1 tentativa
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min - dados considerados "frescos"
      gcTime: 10 * 60 * 1000, // 10 min - manter em cache
      refetchOnWindowFocus: false, // Não recarregar ao focar janela
      refetchOnMount: false, // Não recarregar ao montar componente
      refetchOnReconnect: false, // Não recarregar ao reconectar
      retry: 1, // Apenas 1 retry em caso de erro
      networkMode: 'online'
    },
    mutations: {
      retry: 1,
      networkMode: 'online'
    }
  }
});
