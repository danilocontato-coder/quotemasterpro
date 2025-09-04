import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Eye, Send, FileText, Package, X } from 'lucide-react';

interface StatusProgressIndicatorProps {
  status: string;
  showProgress?: boolean;
}

const statusSteps = [
  { key: 'draft', label: 'Rascunho', icon: FileText },
  { key: 'sent', label: 'Enviada', icon: Send },
  { key: 'receiving', label: 'Recebendo', icon: Package },
  { key: 'under_review', label: 'Em Análise', icon: Eye },
  { key: 'approved', label: 'Aprovada', icon: CheckCircle2 },
  { key: 'rejected', label: 'Rejeitada', icon: X },
];

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'draft':
      return 'secondary';
    case 'sent':
      return 'default';
    case 'receiving':
      return 'secondary';
    case 'under_review':
      return 'secondary';
    case 'approved':
      return 'secondary';
    case 'rejected':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export function StatusProgressIndicator({ status, showProgress = false }: StatusProgressIndicatorProps) {
  const currentStepIndex = statusSteps.findIndex(step => step.key === status);
  
  if (!showProgress) {
    const currentStep = statusSteps.find(step => step.key === status);
    if (!currentStep) return null;
    
    const Icon = currentStep.icon;
    const variant = getStatusVariant(status) as any;
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
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
        
        let stepClasses = '';
        if (isCompleted) {
          stepClasses = 'bg-green-100 text-green-800';
        } else if (isCurrent) {
          // Use specific colors based on current step
          switch (step.key) {
            case 'draft':
              stepClasses = 'bg-gray-100 text-gray-700';
              break;
            case 'sent':
              stepClasses = 'bg-blue-100 text-blue-800';
              break;
            case 'receiving':
              stepClasses = 'bg-purple-100 text-purple-800';
              break;
            case 'under_review':
              stepClasses = 'bg-orange-100 text-orange-800';
              break;
            case 'approved':
              stepClasses = 'bg-green-100 text-green-800';
              break;
            case 'rejected':
              stepClasses = 'bg-red-100 text-red-800';
              break;
            default:
              stepClasses = 'bg-blue-100 text-blue-800';
          }
        } else {
          stepClasses = 'bg-gray-100 text-gray-500';
        }
        
        return (
          <React.Fragment key={step.key}>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${stepClasses}`}>
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