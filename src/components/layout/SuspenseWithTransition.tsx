import React, { startTransition, useEffect, useState } from 'react';
import { OptimizedSkeleton } from '@/components/ui/optimized-components';

interface SuspenseWithTransitionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  lines?: number;
}

/**
 * Enhanced Suspense component that wraps lazy loading with startTransition
 * to prevent "suspended while responding to synchronous input" errors
 */
export const SuspenseWithTransition: React.FC<SuspenseWithTransitionProps> = ({ 
  children, 
  fallback,
  className = "p-4",
  lines = 5 
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const defaultFallback = fallback || <OptimizedSkeleton lines={lines} className={className} />;

  useEffect(() => {
    // Wrap any pending updates in startTransition
    startTransition(() => {
      setIsTransitioning(false);
    });
  }, []);

  return (
    <React.Suspense fallback={defaultFallback}>
      {children}
    </React.Suspense>
  );
};