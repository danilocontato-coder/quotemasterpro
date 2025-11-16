import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import { differenceInDays, differenceInHours, parseISO } from "date-fns";

interface QuoteUrgencyBadgeProps {
  deadline: string;
}

export function QuoteUrgencyBadge({ deadline }: QuoteUrgencyBadgeProps) {
  const now = new Date();
  const deadlineDate = parseISO(deadline);
  const hoursRemaining = differenceInHours(deadlineDate, now);
  const daysRemaining = differenceInDays(deadlineDate, now);

  // Prazo expirado
  if (hoursRemaining < 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Expirado
      </Badge>
    );
  }

  // Urgente: menos de 24 horas
  if (hoursRemaining <= 24) {
    return (
      <Badge className="bg-red-500 text-white gap-1 animate-pulse">
        <Clock className="h-3 w-3" />
        {hoursRemaining}h restantes
      </Badge>
    );
  }

  // Atenção: 1-3 dias
  if (daysRemaining <= 3) {
    return (
      <Badge className="bg-yellow-500 text-white gap-1">
        <Clock className="h-3 w-3" />
        {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
      </Badge>
    );
  }

  // Normal: mais de 3 dias
  return (
    <Badge variant="outline" className="gap-1 text-green-700 border-green-500/30 bg-green-50">
      <Clock className="h-3 w-3" />
      {daysRemaining} dias
    </Badge>
  );
}
