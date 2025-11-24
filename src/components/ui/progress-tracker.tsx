import React from 'react';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepStatus = 'pending' | 'inProgress' | 'completed' | 'error';

export interface ProgressStep {
  id: string;
  label: string;
  status: StepStatus;
}

interface ProgressTrackerProps {
  steps: ProgressStep[];
  className?: string;
}

export function ProgressTracker({ steps, className }: ProgressTrackerProps) {
  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'inProgress':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'error':
        return <Circle className="h-4 w-4 text-red-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-300" />;
    }
  };

  const getStepColor = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'inProgress':
        return 'text-blue-600 font-medium';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className={cn('space-y-2 p-4 bg-muted/50 rounded-lg border', className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-3">
          {getStepIcon(step.status)}
          <span className={cn('text-sm', getStepColor(step.status))}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}
