import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Componente de métrica otimizado
export const OptimizedMetricCard = memo(({ 
  title, 
  value, 
  icon, 
  change,
  className = ""
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  className?: string;
}) => (
  <Card className={`transition-all duration-200 hover:shadow-md ${className}`}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <div className="text-muted-foreground">
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {change && (
        <p className={`text-xs ${
          change.type === 'increase' ? 'text-green-600' : 
          change.type === 'decrease' ? 'text-red-600' : 
          'text-muted-foreground'
        }`}>
          {change.type === 'increase' ? '+' : change.type === 'decrease' ? '-' : ''}
          {Math.abs(change.value)}%
        </p>
      )}
    </CardContent>
  </Card>
));

// Grid de métricas otimizado
export const OptimizedMetricsGrid = memo(({ 
  metrics,
  className = ""
}: {
  metrics: Array<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    change?: {
      value: number;
      type: 'increase' | 'decrease' | 'neutral';
    };
  }>;
  className?: string;
}) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
    {metrics.map((metric, index) => (
      <OptimizedMetricCard
        key={`${metric.title}-${index}`}
        {...metric}
      />
    ))}
  </div>
));

// Skeleton para métricas
export const MetricsSkeleton = memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i} className="animate-pulse">
        <CardHeader className="space-y-0 pb-2">
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-muted rounded w-1/4"></div>
        </CardContent>
      </Card>
    ))}
  </div>
));