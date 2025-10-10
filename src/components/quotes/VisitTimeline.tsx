import { Calendar, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { QuoteVisit } from "@/types/visit";
import { formatLocalDateTime } from "@/utils/dateUtils";

interface VisitTimelineProps {
  visits: QuoteVisit[];
}

export function VisitTimeline({ visits }: VisitTimelineProps) {
  if (!visits || visits.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        Nenhuma visita agendada ainda
      </div>
    );
  }

  // Sort visits by created_at (most recent first)
  const sortedVisits = [...visits].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedVisits.map((visit, index) => (
        <div key={visit.id} className="relative pl-8">
          {/* Timeline line */}
          {index < sortedVisits.length - 1 && (
            <div className="absolute left-2 top-8 h-full w-0.5 bg-gray-200" />
          )}

          {/* Timeline dot/icon */}
          <div className="absolute left-0 top-1">
            {visit.status === 'confirmed' && (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            {visit.status === 'scheduled' && (
              <Calendar className="h-4 w-4 text-blue-600" />
            )}
            {visit.status === 'overdue' && (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            {visit.reschedule_count > 0 && (
              <RefreshCw className="h-4 w-4 text-orange-600" />
            )}
          </div>

          {/* Event content */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">
                {visit.status === 'confirmed' && 'Visita Realizada'}
                {visit.status === 'scheduled' && 'Visita Agendada'}
                {visit.status === 'overdue' && 'Visita Atrasada'}
                {visit.status === 'cancelled' && 'Visita Cancelada'}
              </p>
              <span className="text-xs text-muted-foreground">
                {formatLocalDateTime(visit.created_at)}
              </span>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                Data: {formatLocalDateTime(visit.scheduled_date)}
              </p>
              {visit.notes && (
                <p className="mt-1 italic">"{visit.notes}"</p>
              )}
            </div>

            {visit.confirmed_date && (
              <div className="text-sm bg-green-50 rounded p-2 mt-2">
                <p className="font-medium text-green-900">
                  Realizada em: {formatLocalDateTime(visit.confirmed_date)}
                </p>
                {visit.confirmation_notes && (
                  <p className="text-green-800 mt-1">
                    {visit.confirmation_notes}
                  </p>
                )}
              </div>
            )}

            {visit.reschedule_count > 0 && (
              <div className="text-xs bg-orange-50 text-orange-900 rounded p-2 mt-2">
                <p>
                  Reagendada {visit.reschedule_count}x
                  {visit.previous_date && (
                    <span className="ml-1">
                      (anteriormente: {formatLocalDateTime(visit.previous_date)})
                    </span>
                  )}
                </p>
                {visit.reschedule_reason && (
                  <p className="mt-1 italic">Motivo: {visit.reschedule_reason}</p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
