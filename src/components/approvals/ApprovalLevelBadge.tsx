import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Layers, DollarSign, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ApprovalLevelBadgeProps {
  levelName: string;
  levelOrder: number;
  minAmount: number;
  maxAmount: number | null;
  approverNames?: string[];
  variant?: 'default' | 'outline' | 'secondary';
  showTooltip?: boolean;
}

export const ApprovalLevelBadge: React.FC<ApprovalLevelBadgeProps> = ({
  levelName,
  levelOrder,
  minAmount,
  maxAmount,
  approverNames = [],
  variant = 'outline',
  showTooltip = true,
}) => {
  const badge = (
    <Badge variant={variant} className="gap-1">
      <Layers className="h-3 w-3" />
      {levelName}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">{levelName} (Nível {levelOrder})</p>
            <div className="flex items-center gap-1 text-xs">
              <DollarSign className="h-3 w-3" />
              <span>
                Faixa: {formatCurrency(minAmount)}
                {maxAmount ? ` - ${formatCurrency(maxAmount)}` : ' +'}
              </span>
            </div>
            {approverNames.length > 0 && (
              <div className="flex items-start gap-1 text-xs">
                <Users className="h-3 w-3 mt-0.5" />
                <span>Aprovadores: {approverNames.join(', ')}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
