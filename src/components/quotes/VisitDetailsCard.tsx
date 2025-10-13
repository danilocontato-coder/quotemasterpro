import { Building2, Calendar, Clock, MapPin, FileText, CheckCircle, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuoteVisit } from "@/types/visit";
import { formatDateWithTime, formatLocalDateTime } from "@/utils/dateUtils";

interface VisitDetailsCardProps {
  visit: QuoteVisit;
}

const getStatusConfig = (status: QuoteVisit['status']) => {
  switch (status) {
    case 'scheduled':
      return {
        label: 'Agendada',
        color: 'bg-blue-100 text-blue-800',
        icon: Calendar
      };
    case 'confirmed':
      return {
        label: 'Confirmada',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle
      };
    case 'overdue':
      return {
        label: 'Atrasada',
        color: 'bg-red-100 text-red-800',
        icon: AlertTriangle
      };
    case 'cancelled':
      return {
        label: 'Cancelada',
        color: 'bg-gray-100 text-gray-800',
        icon: XCircle
      };
  }
};

export function VisitDetailsCard({ visit }: VisitDetailsCardProps) {
  const statusConfig = getStatusConfig(visit.status);
  const StatusIcon = statusConfig.icon;
  const { date: scheduledDate, time: scheduledTime } = formatDateWithTime(visit.scheduled_date);
  const { date: confirmedDate, time: confirmedTime } = visit.confirmed_date 
    ? formatDateWithTime(visit.confirmed_date) 
    : { date: null, time: null };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{visit.supplier_name || 'Fornecedor'}</CardTitle>
              <p className="text-sm text-muted-foreground">ID: {visit.supplier_id.slice(0, 8)}...</p>
            </div>
          </div>
          <Badge className={`${statusConfig.color} flex items-center gap-1`}>
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Data e Hora Agendada */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-blue-900">Data Agendada</p>
              <p className="text-sm text-blue-700 mt-1">{scheduledDate}</p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-blue-600" />
                <p className="text-lg font-bold text-blue-900">às {scheduledTime}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data e Hora Confirmada */}
        {visit.status === 'confirmed' && visit.confirmed_date && (
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-900">Visita Realizada</p>
                <p className="text-sm text-green-700 mt-1">{confirmedDate}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4 text-green-600" />
                  <p className="text-lg font-bold text-green-900">às {confirmedTime}</p>
                </div>
                {visit.confirmed_by && (
                  <p className="text-xs text-green-600 mt-2">
                    Confirmado por: ID {visit.confirmed_by.slice(0, 8)}...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notas do Agendamento */}
        {visit.notes && (
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Notas</p>
              <p className="text-sm mt-1">{visit.notes}</p>
            </div>
          </div>
        )}

        {/* Notas de Confirmação */}
        {visit.confirmation_notes && (
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-600">Observações da Realização</p>
              <p className="text-sm mt-1">{visit.confirmation_notes}</p>
            </div>
          </div>
        )}

        {/* Reagendamentos */}
        {visit.reschedule_count > 0 && (
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <RefreshCw className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  Reagendada {visit.reschedule_count}x
                </p>
                {visit.reschedule_reason && (
                  <p className="text-sm text-yellow-700 mt-1">
                    Motivo: {visit.reschedule_reason}
                  </p>
                )}
                {visit.previous_date && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Data anterior: {formatLocalDateTime(visit.previous_date)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            Criada em: {formatLocalDateTime(visit.created_at)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
