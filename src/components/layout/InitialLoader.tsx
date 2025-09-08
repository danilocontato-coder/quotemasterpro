import { useEffect, useState } from 'react';
import { OptimizedSkeleton } from '@/components/ui/optimized-components';

interface InitialLoaderProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export function InitialLoader({ children, enabled = true }: InitialLoaderProps) {
  const [isInitialLoad, setIsInitialLoad] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;

    // Simular carregamento inicial mínimo
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 300); // 300ms mínimo

    return () => clearTimeout(timer);
  }, [enabled]);

  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-6 space-y-6">
          <OptimizedSkeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <OptimizedSkeleton className="h-6 w-full" />
                <OptimizedSkeleton className="h-4 w-3/4" />
                <OptimizedSkeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}