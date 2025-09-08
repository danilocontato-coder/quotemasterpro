import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Eye, Send, FileText, Package, X, Brain } from 'lucide-react';
import { getStatusText } from '@/utils/statusUtils';

interface StatusProgressIndicatorProps {
  status: string;
  showProgress?: boolean;
}

const statusSteps = [
  { key: 'draft', label: 'Rascunho', icon: FileText },
  { key: 'sent', label: 'Enviada', icon: Send },
  { key: 'receiving', label: 'Recebendo', icon: Package },
  { key: 'received', label: 'Recebida', icon: CheckCircle2 },
  { key: 'ai_analyzing', label: 'IA Analisando', icon: Brain },
  { key: 'under_review', label: 'Em Análise', icon: Eye },
  { key: 'approved', label: 'Aprovada', icon: CheckCircle2 },
  { key: 'rejected', label: 'Rejeitada', icon: X },
  { key: 'cancelled', label: 'Cancelada', icon: X },
  { key: 'finalized', label: 'Finalizada', icon: CheckCircle2 },
];

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'draft':
      return 'secondary';
    case 'sent':
      return 'default';
    case 'receiving':
      return 'secondary';
    case 'received':
      return 'secondary';
    case 'ai_analyzing':
      return 'default';
    case 'under_review':
      return 'secondary';
    case 'approved':
      return 'default';
    case 'rejected':
      return 'destructive';
    case 'cancelled':
      return 'destructive';
    case 'finalized':
      return 'default';
    default:
      return 'secondary';
  }
};

export function StatusProgressIndicator({ status, showProgress = false }: StatusProgressIndicatorProps) {
  const currentStepIndex = statusSteps.findIndex(step => step.key === status);
  
  if (!showProgress) {
    // Find the status in our predefined steps
    let currentStep = statusSteps.find(step => step.key === status);
    
    // If not found, create a fallback display using the status text utility
    if (!currentStep) {
      currentStep = {
        key: status,
        label: getStatusText(status),
        icon: Clock
      };
    }
    
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
              stepClasses = 'bg-orange-100 text-orange-800';
              break;
            case 'received':
              stepClasses = 'bg-green-100 text-green-800';
              break;
            case 'ai_analyzing':
              stepClasses = 'bg-purple-100 text-purple-800';
              break;
            case 'under_review':
              stepClasses = 'bg-yellow-100 text-yellow-800';
              break;
            case 'approved':
              stepClasses = 'bg-green-100 text-green-800';
              break;
            case 'rejected':
              stepClasses = 'bg-red-100 text-red-800';
              break;
            case 'cancelled':
              stepClasses = 'bg-gray-100 text-gray-800';
              break;
            case 'finalized':
              stepClasses = 'bg-purple-100 text-purple-800';
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