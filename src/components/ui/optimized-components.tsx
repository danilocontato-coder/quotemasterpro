import React, { memo, Suspense } from 'react';

// Componente de Loading otimizado
export const OptimizedSkeleton = memo(({ 
  lines = 3, 
  className = "" 
}: { 
  lines?: number; 
  className?: string;
}) => (
  <div className={`animate-pulse space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div 
        key={i}
        className="h-4 bg-muted rounded"
        style={{ width: `${100 - (i * 10)}%` }}
      />
    ))}
  </div>
));

// Wrapper para lazy components
// Removed LazyWrapper - causing React 18 suspension issues

// Componente de lista virtualizada otimizada
export const VirtualizedList = memo(<T,>({ 
  items,
  renderItem,
  height = 400,
  itemHeight = 60,
  className = ""
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  height?: number;
  itemHeight?: number;
  className?: string;
}) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleItems = React.useMemo(() => {
    const containerItemCount = Math.ceil(height / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + containerItemCount + 2, items.length);
    
    return items.slice(startIndex, endIndex).map((item, i) => ({
      item,
      index: startIndex + i
    }));
  }, [items, scrollTop, height, itemHeight]);

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const offsetY = Math.floor(scrollTop / itemHeight) * itemHeight;

  return (
    <div 
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div key={index} style={{ height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// Componente de tabela otimizada
export const OptimizedTable = memo(({ 
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="min-w-full divide-y divide-border">
      {children}
    </table>
  </div>
));

// Card otimizado com lazy loading
export const LazyCard = memo(({ 
  children,
  className = "",
  threshold = 0.1
}: {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [threshold]);
  
  return (
    <div ref={ref} className={className}>
      {isVisible ? children : <OptimizedSkeleton lines={3} />}
    </div>
  );
});