import { TimelineEvent } from '@/hooks/useQuoteTimeline';
import { formatLocalDateTime } from '@/utils/dateUtils';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Package,
  UserCheck,
  CalendarCheck,
  Brain,
  CircleDot
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface QuoteJourneyTimelineProps {
  events: TimelineEvent[];
}

export function QuoteJourneyTimeline({ events }: QuoteJourneyTimelineProps) {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'quote_created':
        return <FileText className="w-5 h-5" />;
      case 'status_change':
        return <Clock className="w-5 h-5" />;
      case 'supplier_response':
        return <TrendingUp className="w-5 h-5" />;
      case 'ai_analysis':
        return <Brain className="w-5 h-5" />;
      case 'technical_visit':
        return <CalendarCheck className="w-5 h-5" />;
      case 'delivery':
        return <Package className="w-5 h-5" />;
      case 'approval':
        return <UserCheck className="w-5 h-5" />;
      default:
        return <CircleDot className="w-5 h-5" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'quote_created':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'status_change':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'supplier_response':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'ai_analysis':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'technical_visit':
        return 'text-cyan-600 bg-cyan-50 border-cyan-200';
      case 'delivery':
        return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      case 'approval':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadge = (metadata: Record<string, any>) => {
    if (metadata.status) {
      const status = metadata.status;
      let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
      let label = status;

      switch (status) {
        case 'draft':
          variant = 'secondary';
          label = 'Rascunho';
          break;
        case 'sent':
          variant = 'default';
          label = 'Enviado';
          break;
        case 'approved':
          variant = 'default';
          label = 'Aprovado';
          break;
        case 'rejected':
          variant = 'destructive';
          label = 'Rejeitado';
          break;
        case 'pending':
          variant = 'outline';
          label = 'Pendente';
          break;
        case 'completed':
          label = 'Concluído';
          break;
        case 'confirmed':
          label = 'Confirmado';
          break;
      }

      return <Badge variant={variant} className="ml-2">{label}</Badge>;
    }
    return null;
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum evento registrado para esta cotação</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const colorClass = getEventColor(event.event_type);
        
        return (
          <div key={event.event_id} className="relative pl-8">
            {/* Linha vertical conectando eventos */}
            {index < events.length - 1 && (
              <div className="absolute left-2.5 top-10 bottom-0 w-0.5 bg-border" />
            )}
            
            {/* Ícone do evento */}
            <div className={`absolute left-0 top-1 p-1 rounded-full border-2 ${colorClass}`}>
              {getEventIcon(event.event_type)}
            </div>

            {/* Card do evento */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground">
                        {event.event_title}
                      </h4>
                      {getStatusBadge(event.event_metadata)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {event.event_description}
                    </p>

                    {/* Metadata adicional */}
                    {event.event_metadata && Object.keys(event.event_metadata).length > 1 && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-md text-xs space-y-1">
                        {event.event_metadata.total_price && (
                          <div>
                            <span className="font-medium">Valor:</span> R$ {Number(event.event_metadata.total_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                        {event.event_metadata.supplier_name && (
                          <div>
                            <span className="font-medium">Fornecedor:</span> {event.event_metadata.supplier_name}
                          </div>
                        )}
                        {event.event_metadata.comments && (
                          <div>
                            <span className="font-medium">Comentários:</span> {event.event_metadata.comments}
                          </div>
                        )}
                        {event.event_metadata.notes && (
                          <div>
                            <span className="font-medium">Observações:</span> {event.event_metadata.notes}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Informações do usuário */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      {event.user_name && (
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          {event.user_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatLocalDateTime(event.event_date)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
