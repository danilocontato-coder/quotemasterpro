import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, 
  DollarSign, 
  Edit, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { EVENT_TYPES } from '@/constants/contracts';
import type { Database } from '@/integrations/supabase/types';

type ContractHistory = Database['public']['Tables']['contract_history']['Row'];

interface ContractHistoryTimelineProps {
  history: ContractHistory[];
  isLoading: boolean;
}

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case 'criacao':
      return <FileText className="h-4 w-4" />;
    case 'ativacao':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'reajuste':
      return <DollarSign className="h-4 w-4 text-blue-600" />;
    case 'aditivo':
      return <Edit className="h-4 w-4 text-purple-600" />;
    case 'renovacao':
      return <Calendar className="h-4 w-4 text-green-600" />;
    case 'suspensao':
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    case 'reativacao':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'cancelamento':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'expiracao':
      return <Clock className="h-4 w-4 text-gray-600" />;
    case 'revisao':
      return <Edit className="h-4 w-4 text-blue-600" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getEventColor = (eventType: string) => {
  switch (eventType) {
    case 'ativacao':
    case 'renovacao':
    case 'reativacao':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'reajuste':
    case 'revisao':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'aditivo':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'suspensao':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'cancelamento':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'expiracao':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const ContractHistoryTimeline: React.FC<ContractHistoryTimelineProps> = ({
  history,
  isLoading
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico do Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico do Contrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Nenhum evento registrado ainda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Histórico do Contrato
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-6">
          {/* Timeline vertical line */}
          <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-border" />

          {history.map((event, index) => (
            <div key={event.id} className="relative flex gap-4">
              {/* Icon */}
              <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background ${getEventColor(event.event_type)}`}>
                {getEventIcon(event.event_type)}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">
                        {EVENT_TYPES[event.event_type as keyof typeof EVENT_TYPES]}
                      </h4>
                      <Badge variant="outline" className={getEventColor(event.event_type)}>
                        {EVENT_TYPES[event.event_type as keyof typeof EVENT_TYPES]}
                      </Badge>
                    </div>

                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {event.description}
                      </p>
                    )}

                    {/* Value changes */}
                    {(event.old_value !== null || event.new_value !== null) && (
                      <div className="flex items-center gap-2 text-sm mb-2">
                        {event.old_value !== null && (
                          <>
                            <span className="text-muted-foreground">
                              De: <span className="font-medium">R$ {Number(event.old_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </span>
                            <span className="text-muted-foreground">→</span>
                          </>
                        )}
                        {event.new_value !== null && (
                          <span className="text-muted-foreground">
                            Para: <span className="font-medium text-foreground">R$ {Number(event.new_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </span>
                        )}
                        {event.adjustment_percentage !== null && (
                          <Badge variant="outline" className="ml-2">
                            {event.adjustment_percentage > 0 ? '+' : ''}{event.adjustment_percentage}%
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Attachments */}
                    {event.attachments && Object.keys(event.attachments as any).length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <FileText className="h-3 w-3" />
                        <span>Com anexos</span>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(event.created_at || event.event_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {event.changed_by && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          ID: {event.changed_by.substring(0, 8)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {index < history.length - 1 && <Separator className="mt-6" />}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
