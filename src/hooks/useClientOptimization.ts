import { useCallback, useRef } from 'react';

/**
 * Hook para otimizar operações de clientes e evitar travamentos
 */
export function useClientOptimization() {
  const operationRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Debounce para evitar múltiplas operações simultâneas
  const debounceOperation = useCallback((key: string, operation: () => void, delay = 500) => {
    if (operationRef.current.has(key)) {
      console.log(`Operação ${key} já em andamento, ignorando...`);
      return false;
    }

    operationRef.current.add(key);

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      operation();
      operationRef.current.delete(key);
    }, delay);

    return true;
  }, []);

  // Limpar operações pendentes
  const clearOperations = useCallback(() => {
    clearTimeout(timeoutRef.current);
    operationRef.current.clear();
  }, []);

  // Verificar se operação está em andamento
  const isOperationPending = useCallback((key: string) => {
    return operationRef.current.has(key);
  }, []);

  return {
    debounceOperation,
    clearOperations,
    isOperationPending
  };
}