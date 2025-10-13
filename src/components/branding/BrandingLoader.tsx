import React from 'react';
import { OptimizedSkeleton } from '@/components/ui/optimized-components';

export function BrandingLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-primary/90 flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        {/* Logo Skeleton com fundo branco para destaque */}
        <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 mb-6">
          <OptimizedSkeleton className="h-16 w-48 mx-auto" />
        </div>
        
        {/* Texto de carregamento */}
        <div className="text-center">
          <OptimizedSkeleton className="h-4 w-32 mx-auto mb-2" />
          <OptimizedSkeleton className="h-3 w-48 mx-auto" />
        </div>
      </div>
    </div>
  );
}
