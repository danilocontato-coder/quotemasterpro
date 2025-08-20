import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Eye, Send, FileText, Package } from 'lucide-react';
import { Quote } from '@/data/mockData';

interface StatusProgressIndicatorProps {
  status: Quote['status'];
  showProgress?: boolean;
}

const statusSteps = [
  { key: 'draft', label: 'Rascunho', icon: FileText },
  { key: 'active', label: 'Enviada', icon: Send },
  { key: 'receiving', label: 'Recebendo', icon: Eye },
  { key: 'approved', label: 'Aprovada', icon: CheckCircle2 },
  { key: 'finalized', label: 'Finalizada', icon: Package },
];

export function StatusProgressIndicator({ status, showProgress = false }: StatusProgressIndicatorProps) {
  const currentStepIndex = statusSteps.findIndex(step => step.key === status);
  
  if (!showProgress) {
    const currentStep = statusSteps.find(step => step.key === status);
    if (!currentStep) return null;
    
    const Icon = currentStep.icon;
    return (
      <Badge className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {currentStep.label}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {statusSteps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isPending = index > currentStepIndex;
        
        return (
          <React.Fragment key={step.key}>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              isCompleted 
                ? 'bg-green-100 text-green-800' 
                : isCurrent 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-500'
            }`}>
              <Icon className="h-3 w-3" />
              <span className="font-medium">{step.label}</span>
            </div>
            
            {index < statusSteps.length - 1 && (
              <div className={`w-8 h-0.5 ${
                isCompleted ? 'bg-green-300' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}