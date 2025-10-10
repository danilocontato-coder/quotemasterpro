import { Calendar, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VisitStatusBadgeProps {
  status: 'scheduled' | 'confirmed' | 'overdue' | 'cancelled';
}

const statusConfig = {
  scheduled: {
    label: 'Visita Agendada',
    color: 'bg-blue-100 text-blue-800',
    icon: Calendar,
  },
  confirmed: {
    label: 'Visita Confirmada',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
  },
  overdue: {
    label: 'Visita Atrasada',
    color: 'bg-red-100 text-red-800',
    icon: AlertTriangle,
  },
  cancelled: {
    label: 'Visita Cancelada',
    color: 'bg-gray-100 text-gray-800',
    icon: XCircle,
  },
};

export function VisitStatusBadge({ status }: VisitStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.scheduled;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
