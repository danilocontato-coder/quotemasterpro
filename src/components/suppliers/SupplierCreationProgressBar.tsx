import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface SupplierCreationProgressBarProps {
  completionPercentage: number;
  className?: string;
}

export function SupplierCreationProgressBar({ 
  completionPercentage, 
  className 
}: SupplierCreationProgressBarProps) {
  const getProgressColor = () => {
    if (completionPercentage >= 100) return 'bg-green-600';
    if (completionPercentage >= 75) return 'bg-blue-600';
    if (completionPercentage >= 50) return 'bg-yellow-600';
    return 'bg-orange-600';
  };

  const getStatusText = () => {
    if (completionPercentage >= 100) return '✅ Pronto para finalizar';
    if (completionPercentage >= 75) return '⏳ Quase lá';
    if (completionPercentage >= 50) return '📝 Preenchendo';
    return '🚀 Iniciando';
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Progresso do Formulário
        </span>
        <span className="text-sm font-semibold">
          {Math.round(completionPercentage)}%
        </span>
      </div>
      
      <Progress 
        value={completionPercentage} 
        className="h-2"
      />
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {getStatusText()}
        </span>
        {completionPercentage >= 100 && (
          <span className="text-xs font-medium text-green-600">
            Completo
          </span>
        )}
      </div>
    </div>
  );
}
