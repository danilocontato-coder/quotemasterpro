import { useCallback } from 'react';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  key: string;
}

export function useOptimizedCache() {
  const setCache = useCallback((key: string, data: any, ttl: number = 5 * 60 * 1000) => {
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl
    };
    sessionStorage.setItem(key, JSON.stringify(cacheData));
  }, []);

  const getCache = useCallback((key: string) => {
    try {
      const cached = sessionStorage.getItem(key);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const age = Date.now() - cacheData.timestamp;

      if (age > cacheData.ttl) {
        sessionStorage.removeItem(key);
        return null;
      }

      return cacheData.data;
    } catch {
      sessionStorage.removeItem(key);
      return null;
    }
  }, []);

  const clearCache = useCallback((pattern?: string) => {
    if (pattern) {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.includes(pattern)) {
          sessionStorage.removeItem(key);
        }
      }
    } else {
      sessionStorage.clear();
    }
  }, []);

  return { setCache, getCache, clearCache };
}