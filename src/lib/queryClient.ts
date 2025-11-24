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
      staleTime: 2 * 60 * 1000, // 2 min - mais responsivo
      gcTime: 10 * 60 * 1000, // 10 min - manter em cache
      refetchOnWindowFocus: true, // Reativar para manter dados frescos
      refetchOnMount: false, // Manter desabilitado (evita duplicatas)
      refetchOnReconnect: true, // Reativar (importante após offline)
      retry: 1, // Apenas 1 retry em caso de erro
      networkMode: 'online'
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['quotes'] });
        queryClient.invalidateQueries({ queryKey: ['approvals'] });
      }
    }
  }
});
