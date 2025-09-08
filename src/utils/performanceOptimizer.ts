/**
 * Performance optimizer utilities to prevent loops and excessive console logging
 */

// Silenciar logs de debug em produção
export const debugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (window as any).__DEBUG__) {
    console.log(message, data);
  }
};

// Throttle para prevenir múltiplas execuções
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Debounce para prevenir múltiplas execuções
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Cache com TTL para evitar chamadas desnecessárias
export class TTLCache<T = any> {
  private cache = new Map<string, { value: T; expiry: number }>();

  set(key: string, value: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Singleton cache instance
export const globalCache = new TTLCache();

// Prevent memory leaks from excessive re-renders
export const cleanupMemory = () => {
  // Clear cache periodically
  globalCache.clear();
  
  // Clear sessionStorage of old cache entries
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('_time')) {
      const timestamp = sessionStorage.getItem(key);
      if (timestamp && Date.now() - parseInt(timestamp) > 10 * 60 * 1000) { // 10 minutes
        sessionStorage.removeItem(key);
        sessionStorage.removeItem(key.replace('_time', ''));
      }
    }
  });
};

// Initialize memory cleanup on page load
if (typeof window !== 'undefined') {
  // Clean up every 5 minutes
  setInterval(cleanupMemory, 5 * 60 * 1000);
  
  // Clean up on page unload
  window.addEventListener('beforeunload', cleanupMemory);
}

// Silence noisy console logs in production
export const silenceProductionLogs = () => {
  if (process.env.NODE_ENV === 'production') {
    const originalLog = console.log;
    const originalWarn = console.warn;
    
    console.log = (...args: any[]) => {
      const message = args[0];
      if (typeof message === 'string' && (
        message.includes('DEBUG:') ||
        message.includes('[DEBUG]') ||
        message.includes('🔍') ||
        message.includes('📋') ||
        message.includes('📊') ||
        message.includes('💬')
      )) {
        return; // Silence debug logs
      }
      originalLog.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const message = args[0];
      if (typeof message === 'string' && message.includes('React Router Future Flag Warning')) {
        return; // Silence router warnings
      }
      originalWarn.apply(console, args);
    };
  }
};

// Initialize on module load
silenceProductionLogs();