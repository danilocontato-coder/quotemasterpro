import React, { memo, useCallback, useMemo, lazy, Suspense, useState, useEffect, useRef } from 'react';
import { debounce } from 'lodash';

// Sistema de otimização global de performance
export const performanceConfig = {
  // Debounce delays
  SEARCH_DEBOUNCE: 300,
  FILTER_DEBOUNCE: 200,
  RESIZE_DEBOUNCE: 100,
  
  // Virtualization
  VIRTUAL_LIST_THRESHOLD: 50,
  VIRTUAL_ITEM_HEIGHT: 60,
  
  // Lazy loading
  INTERSECTION_THRESHOLD: 0.1,
  ROOT_MARGIN: '50px',
  
  // Memory thresholds
  MEMORY_WARNING_THRESHOLD: 50, // MB
  MEMORY_CRITICAL_THRESHOLD: 100, // MB
};

// HOC para otimização automática de componentes
export function withPerformanceOptimization<T extends object>(
  Component: React.ComponentType<T>,
  options: {
    memo?: boolean;
    displayName?: string;
    trackRenders?: boolean;
  } = {}
) {
  const { memo: shouldMemo = true, displayName, trackRenders = false } = options;
  
  let renderCount = 0;
  
  const OptimizedComponent = (props: T) => {
    if (trackRenders) {
      renderCount++;
      console.log(`🔄 ${displayName || Component.name}: Render #${renderCount}`);
    }
    
    return React.createElement(Component, props);
  };
  
  OptimizedComponent.displayName = displayName || `Optimized(${Component.displayName || Component.name})`;
  
  return shouldMemo ? memo(OptimizedComponent) : OptimizedComponent;
}

// Hook para lazy loading com Intersection Observer
export function useLazyLoading(threshold = performanceConfig.INTERSECTION_THRESHOLD) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { 
        threshold,
        rootMargin: performanceConfig.ROOT_MARGIN
      }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [threshold]);
  
  return { ref, isVisible };
}

// Hook para debounce otimizado
export function useOptimizedDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const debouncedCallback = useMemo(
    () => debounce(callback, delay),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delay, ...deps]
  );
  
  useEffect(() => {
    return () => {
      debouncedCallback.cancel();
    };
  }, [debouncedCallback]);
  
  return debouncedCallback as T;
}

// Hook para virtualization de listas
export function useVirtualization<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number = performanceConfig.VIRTUAL_ITEM_HEIGHT
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const containerItemCount = Math.ceil(containerHeight / itemHeight);
    const totalItems = items.length;
    
    if (totalItems <= performanceConfig.VIRTUAL_LIST_THRESHOLD) {
      return items.map((item, index) => ({ item, index }));
    }
    
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + containerItemCount + 1, totalItems);
    
    return items
      .slice(startIndex, endIndex)
      .map((item, i) => ({ item, index: startIndex + i }));
  }, [items, scrollTop, containerHeight, itemHeight]);
  
  const handleScroll = useOptimizedDebounce(
    (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
    16 // ~60fps
  );
  
  return {
    visibleItems,
    handleScroll,
    totalHeight: items.length * itemHeight,
    offsetY: Math.floor(scrollTop / itemHeight) * itemHeight
  };
}

// Lazy loading de componentes críticos
export const LazyDashboard = lazy(() => import('@/pages/Dashboard'));
export const LazyClientsManagement = lazy(() => import('@/pages/admin/ClientsManagement'));
export const LazyQuotes = lazy(() => import('@/pages/Quotes'));
export const LazySuppliers = lazy(() => import('@/pages/Suppliers'));
export const LazyProducts = lazy(() => import('@/pages/Products'));

// Monitor de performance em tempo real
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    memory: 0,
    renderTime: 0,
    lastUpdate: Date.now()
  });
  
  useEffect(() => {
    const checkPerformance = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        
        setMetrics(prev => ({
          ...prev,
          memory: usedMB,
          lastUpdate: Date.now()
        }));
        
        if (usedMB > performanceConfig.MEMORY_WARNING_THRESHOLD) {
          console.warn(`⚠️ Alto uso de memória: ${usedMB.toFixed(2)}MB`);
        }
        
        if (usedMB > performanceConfig.MEMORY_CRITICAL_THRESHOLD) {
          console.error(`🚨 Uso crítico de memória: ${usedMB.toFixed(2)}MB`);
        }
      }
    };
    
    checkPerformance();
    const interval = setInterval(checkPerformance, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return metrics;
}