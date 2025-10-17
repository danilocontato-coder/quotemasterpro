import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDelivery } from '@/hooks/useClientDeliveries';
import { Package, MapPin, Calendar, DollarSign, Building2, Truck, Key, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { UberDeliveryTracking } from '@/components/client/delivery/UberDeliveryTracking';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface DeliveryCardProps {
  delivery: ClientDelivery;
  onConfirm: (deliveryId: string) => void;
}

export function DeliveryCard({ delivery, onConfirm }: DeliveryCardProps) {
  const navigate = useNavigate();
  const [deliveryMethod, setDeliveryMethod] = useState<string>('own');

  useEffect(() => {
    const fetchDeliveryMethod = async () => {
      const { data } = await supabase
        .from('deliveries')
        .select('delivery_method')
        .eq('id', delivery.id)
        .single();
      
      if (data?.delivery_method) {
        setDeliveryMethod(data.delivery_method);
      }
    };

    fetchDeliveryMethod();
  }, [delivery.id]);

  const getStatusConfig = () => {
    switch (delivery.status) {
      case 'pending':
        return {
          label: 'Aguardando Agendamento',
          color: 'bg-gray-100 text-gray-700',
          icon: Clock,
          iconColor: 'text-gray-600',
        };
      case 'scheduled':
        return {
          label: 'Agendada',
          color: 'bg-blue-100 text-blue-700',
          icon: Calendar,
          iconColor: 'text-blue-600',
        };
      case 'in_transit':
        return {
          label: 'Em Trânsito',
          color: 'bg-orange-100 text-orange-700',
          icon: Truck,
          iconColor: 'text-orange-600',
        };
      case 'delivered':
        return {
          label: 'Entregue e Confirmada',
          color: 'bg-green-100 text-green-700',
          icon: CheckCircle2,
          iconColor: 'text-green-600',
        };
      default:
        return {
          label: delivery.status,
          color: 'bg-gray-100 text-gray-700',
          icon: Package,
          iconColor: 'text-gray-600',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${statusConfig.color.split(' ')[0]}`}>
                <StatusIcon className={`h-5 w-5 ${statusConfig.iconColor}`} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Entrega #{delivery.id.substring(0, 8)}</h3>
                <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{delivery.quote_local_code}</span>
              <span className="text-muted-foreground">-</span>
              <span className="text-muted-foreground">{delivery.quote_title}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{delivery.supplier_name}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{formatCurrency(delivery.payment_amount)}</span>
            </div>

            {delivery.scheduled_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Agendada: {formatDate(delivery.scheduled_date)}
                </span>
              </div>
            )}

            {delivery.actual_delivery_date && delivery.status === 'delivered' && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">
                  Confirmada: {formatDate(delivery.actual_delivery_date)}
                </span>
              </div>
            )}

            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">{delivery.delivery_address}</span>
            </div>

            {delivery.tracking_code && (
              <div className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Rastreio:</span>
                <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  {delivery.tracking_code}
                </code>
              </div>
            )}

            {delivery.status === 'delivered' && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Pagamento liberado automaticamente</span>
                </p>
              </div>
            )}

            {/* Rastreamento Uber */}
            {deliveryMethod === 'uber' && (
              <div className="mt-4">
                <UberDeliveryTracking deliveryId={delivery.id} />
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Actions */}
          <div className="flex gap-2">
            {delivery.can_confirm && (
              <Button 
                onClick={() => onConfirm(delivery.id)}
                className="flex-1"
              >
                <Key className="h-4 w-4 mr-2" />
                Confirmar Recebimento
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={() => navigate(`/client/payments#${delivery.payment_id}`)}
              className={delivery.can_confirm ? '' : 'flex-1'}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Ver Pagamento
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
