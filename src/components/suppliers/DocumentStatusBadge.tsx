import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type DocumentStatus = 'pending' | 'validated' | 'rejected' | 'expired';

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  showIcon?: boolean;
  className?: string;
  tooltipContent?: string;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pendente',
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-border',
  },
  validated: {
    label: 'Validado',
    icon: CheckCircle2,
    className: 'bg-success/10 text-success border-success/20',
  },
  rejected: {
    label: 'Rejeitado',
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  expired: {
    label: 'Expirado',
    icon: AlertTriangle,
    className: 'bg-warning/10 text-warning border-warning/20',
  },
};

export function DocumentStatusBadge({
  status,
  showIcon = true,
  className = '',
  tooltipContent,
}: DocumentStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const badge = (
    <Badge variant="outline" className={`${config.className} ${className}`}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );

  if (tooltipContent) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
