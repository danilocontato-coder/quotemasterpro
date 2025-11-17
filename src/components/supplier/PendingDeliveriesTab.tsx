import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, Package, Truck } from 'lucide-react';
import { usePendingDeliveries } from '@/hooks/usePendingDeliveries';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface PendingDeliveriesTabProps {
  onScheduleDelivery: (quoteId: string) => void;
}

export function PendingDeliveriesTab({ onScheduleDelivery }: PendingDeliveriesTabProps) {
  const { pendingDeliveries, isLoading } = usePendingDeliveries();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (pendingDeliveries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Nenhuma entrega pendente</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Quando houver pagamentos confirmados, eles aparecerão aqui para agendamento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cotações Prontas para Agendamento</h3>
          <p className="text-sm text-muted-foreground">
            {pendingDeliveries.length} {pendingDeliveries.length === 1 ? 'cotação aguardando' : 'cotações aguardando'} agendamento de entrega
          </p>
        </div>
      </div>

      {pendingDeliveries.map((pending) => (
        <Card key={pending.quote_id} className="border-2 border-green-200 bg-gradient-to-r from-green-50/50 to-blue-50/50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold">
                    🎉
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-lg">
                        Cotação #{pending.quote_local_code}
                      </h4>
                      <Badge className="bg-green-600 text-white">
                        ✅ Pagamento Confirmado
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground">{pending.quote_title}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-13">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Cliente</div>
                      <div className="font-medium">{pending.client_name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Valor</div>
                      <div className="font-medium text-green-700">
                        {formatCurrency(pending.payment_amount)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Pagamento</div>
                      <div className="font-medium">
                        {format(new Date(pending.payment_date), "dd 'de' MMMM", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="pl-13 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Próximo passo:</strong> O pagamento está em custódia e será liberado após a confirmação da entrega pelo cliente.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => onScheduleDelivery(pending.quote_id)}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 whitespace-nowrap"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Agendar Entrega
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
