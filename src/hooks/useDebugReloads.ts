import { useRef } from 'react';

/**
 * Hook de debug desabilitado temporariamente para melhorar performance
 */
export function useDebugReloads(user?: { id: string; role: string } | null) {
  const renderCountRef = useRef(0);
  
  renderCountRef.current++;
  
  // Hook desabilitado para evitar spam de logs e melhorar performance
  // Remover na próxima versão após confirmar estabilidade
  
  return null;
}