import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AsyncActionOptions {
  onSuccess?: (result?: any) => void;
  onError?: (error: any) => void;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Hook para gerenciar ações assíncronas com loading state e tratamento de erros
 * Evita travamentos da UI garantindo que funções assíncronas sejam aguardadas
 */
export function useAsyncAction<T extends (...args: any[]) => Promise<any>>(
  asyncFunction: T,
  options: AsyncActionOptions = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const execute = useCallback(async (...args: Parameters<T>) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const result = await asyncFunction(...args);
      
      if (options.successMessage) {
        toast({
          title: 'Sucesso',
          description: options.successMessage,
        });
      }
      
      options.onSuccess?.(result);
      return result;
    } catch (error) {
      console.error('AsyncAction error:', error);
      
      const errorMessage = options.errorMessage || 'Ocorreu um erro inesperado. Tente novamente.';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      
      options.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [asyncFunction, isLoading, options, toast]);

  return {
    execute,
    isLoading,
  };
}