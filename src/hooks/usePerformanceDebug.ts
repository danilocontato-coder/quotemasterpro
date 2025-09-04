import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  totalRenderTime: number;
}

export function usePerformanceDebug(componentName: string, enabled = true) {
  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    totalRenderTime: 0
  });
  
  const startTimeRef = useRef<number>(performance.now());

  // Rastrear renders
  useEffect(() => {
    if (!enabled) return;
    
    const endTime = performance.now();
    const renderTime = endTime - startTimeRef.current;
    
    metricsRef.current.renderCount++;
    metricsRef.current.lastRenderTime = renderTime;
    metricsRef.current.totalRenderTime += renderTime;
    metricsRef.current.averageRenderTime = metricsRef.current.totalRenderTime / metricsRef.current.renderCount;

    if (renderTime > 16) { // 16ms = 60fps threshold
      console.warn(`🐌 ${componentName}: Render lento (${renderTime.toFixed(2)}ms)`);
    }

    if (metricsRef.current.renderCount % 10 === 0) {
      console.log(`📊 ${componentName} Métricas:`, {
        renders: metricsRef.current.renderCount,
        avgRenderTime: metricsRef.current.averageRenderTime.toFixed(2) + 'ms',
        lastRenderTime: metricsRef.current.lastRenderTime.toFixed(2) + 'ms'
      });
    }
  });

  // Reset timer para próximo render
  startTimeRef.current = performance.now();

  const logOperation = useCallback((operationName: string, fn: () => any) => {
    if (!enabled) return fn();
    
    const start = performance.now();
    console.log(`🚀 ${componentName}: Iniciando ${operationName}`);
    
    try {
      const result = fn();
      
      if (result && typeof result.then === 'function') {
        // É uma Promise
        return result
          .then((data: any) => {
            const duration = performance.now() - start;
            console.log(`✅ ${componentName}: ${operationName} concluído (${duration.toFixed(2)}ms)`);
            return data;
          })
          .catch((error: any) => {
            const duration = performance.now() - start;
            console.error(`❌ ${componentName}: ${operationName} falhou (${duration.toFixed(2)}ms)`, error);
            throw error;
          });
      } else {
        // Operação síncrona
        const duration = performance.now() - start;
        console.log(`✅ ${componentName}: ${operationName} concluído (${duration.toFixed(2)}ms)`);
        return result;
      }
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`❌ ${componentName}: ${operationName} falhou (${duration.toFixed(2)}ms)`, error);
      throw error;
    }
  }, [componentName, enabled]);

  const trackAsyncOperation = useCallback(async (operationName: string, asyncFn: () => Promise<any>) => {
    if (!enabled) return asyncFn();
    
    const start = performance.now();
    console.log(`🚀 ${componentName}: Iniciando operação assíncrona ${operationName}`);
    
    try {
      const result = await asyncFn();
      const duration = performance.now() - start;
      
      if (duration > 1000) {
        console.warn(`🐌 ${componentName}: ${operationName} muito lento (${duration.toFixed(2)}ms)`);
      } else {
        console.log(`✅ ${componentName}: ${operationName} concluído (${duration.toFixed(2)}ms)`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`❌ ${componentName}: ${operationName} falhou (${duration.toFixed(2)}ms)`, error);
      throw error;
    }
  }, [componentName, enabled]);

  return {
    logOperation,
    trackAsyncOperation,
    metrics: metricsRef.current
  };
}

// Hook para detectar vazamentos de memória
export function useMemoryDebug(componentName: string) {
  const mountTimeRef = useRef<number>(performance.now());
  
  useEffect(() => {
    console.log(`🔧 ${componentName}: Componente montado`);
    
    return () => {
      const lifespan = performance.now() - mountTimeRef.current;
      console.log(`🔧 ${componentName}: Componente desmontado após ${lifespan.toFixed(2)}ms`);
    };
  }, [componentName]);

  const checkMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log(`💾 ${componentName} Uso de memória:`, {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
      });
    }
  }, [componentName]);

  return { checkMemory };
}