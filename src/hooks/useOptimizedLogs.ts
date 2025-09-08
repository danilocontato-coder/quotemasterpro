import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook otimizado para logs de debug que reduz spam de console
 */
export function useOptimizedLogs() {
  const { user } = useAuth();
  
  const logThrottled = useMemo(() => {
    const cache = new Map<string, number>();
    
    return (key: string, data: any, interval = 5000) => {
      const now = Date.now();
      const lastLog = cache.get(key) || 0;
      
      if (now - lastLog > interval) {
        console.log(`🔍 [${key}]`, data);
        cache.set(key, now);
      }
    };
  }, []);
  
  const debugQuotes = useCallback((data: any) => {
    logThrottled('QUOTES-DATA', {
      quotes: data?.length || 0,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });
  }, [logThrottled, user?.id]);
  
  const debugPerformance = useCallback((operation: string, duration: number) => {
    if (duration > 1000) { // Log apenas operações lentas
      console.warn(`⚠️ [PERFORMANCE] ${operation} took ${duration}ms`);
    }
  }, []);
  
  return {
    debugQuotes,
    debugPerformance,
    logThrottled
  };
}