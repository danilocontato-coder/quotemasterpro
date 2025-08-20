import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FilterMetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
}

export function FilterMetricCard({ 
  title, 
  value, 
  icon, 
  isActive, 
  onClick, 
  variant = 'default' 
}: FilterMetricCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100';
      case 'warning':
        return 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100';
      case 'destructive':
        return 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100';
      case 'secondary':
        return 'text-muted-foreground bg-muted border-border hover:bg-muted/80';
      default:
        return 'text-primary bg-primary/5 border-primary/20 hover:bg-primary/10';
    }
  };

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        isActive ? 'ring-2 ring-primary shadow-md' : '',
        getVariantStyles()
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">{title}</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{value}</span>
              {value > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {value}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-2xl opacity-60">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}