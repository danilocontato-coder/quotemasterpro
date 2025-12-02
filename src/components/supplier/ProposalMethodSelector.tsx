import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Edit3, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProposalMethod = 'manual' | 'pdf';

interface ProposalMethodSelectorProps {
  selectedMethod: ProposalMethod;
  onMethodChange: (method: ProposalMethod) => void;
  hasAttachment?: boolean;
  attachmentName?: string;
}

export const ProposalMethodSelector: React.FC<ProposalMethodSelectorProps> = ({
  selectedMethod,
  onMethodChange,
  hasAttachment,
  attachmentName
}) => {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">
        Como deseja enviar sua proposta?
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Opção Manual */}
        <Card
          className={cn(
            "p-4 cursor-pointer transition-all border-2",
            selectedMethod === 'manual'
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-primary/50"
          )}
          onClick={() => onMethodChange('manual')}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              selectedMethod === 'manual' ? "bg-primary/10" : "bg-muted"
            )}>
              <Edit3 className={cn(
                "h-5 w-5",
                selectedMethod === 'manual' ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className={cn(
                  "font-medium",
                  selectedMethod === 'manual' ? "text-primary" : "text-foreground"
                )}>
                  Preencher Manualmente
                </h4>
                {selectedMethod === 'manual' && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Insira os valores diretamente nos campos abaixo
              </p>
            </div>
          </div>
        </Card>

        {/* Opção PDF */}
        <Card
          className={cn(
            "p-4 cursor-pointer transition-all border-2",
            selectedMethod === 'pdf'
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-primary/50"
          )}
          onClick={() => onMethodChange('pdf')}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              selectedMethod === 'pdf' ? "bg-primary/10" : "bg-muted"
            )}>
              <FileText className={cn(
                "h-5 w-5",
                selectedMethod === 'pdf' ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className={cn(
                  "font-medium",
                  selectedMethod === 'pdf' ? "text-primary" : "text-foreground"
                )}>
                  Enviar PDF da Proposta
                </h4>
                {selectedMethod === 'pdf' && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <p className="text-xs text-muted-foreground">
                  IA extrai os dados automaticamente
                </p>
              </div>
              {hasAttachment && attachmentName && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  📄 {attachmentName}
                </Badge>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
