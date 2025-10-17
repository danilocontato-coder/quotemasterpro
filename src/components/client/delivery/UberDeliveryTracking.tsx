import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, User, Phone, ExternalLink, Package, Truck } from 'lucide-react';

interface UberDeliveryTrackingProps {
  deliveryId: string;
}

interface DeliveryData {
  id: string;
  status: string;
  uber_status: string;
  uber_tracking_url: string;
  uber_courier_name?: string;
  uber_courier_phone?: string;
  uber_courier_location?: any;
  uber_fee: number;
}

export const UberDeliveryTracking = ({ deliveryId }: UberDeliveryTrackingProps) => {
  const [delivery, setDelivery] = useState<DeliveryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDelivery();

    // Subscrever a atualizações em tempo real
    const channel = supabase
      .channel(`delivery-${deliveryId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deliveries',
          filter: `id=eq.${deliveryId}`,
        },
        (payload) => {
          console.log('[UBER-TRACKING] Real-time update:', payload);
          setDelivery(payload.new as DeliveryData);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deliveryId]);

  const fetchDelivery = async () => {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', deliveryId)
        .eq('delivery_method', 'uber')
        .single();

      if (error) throw error;
      setDelivery(data);
    } catch (error) {
      console.error('[UBER-TRACKING] Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500';
      case 'in_transit':
        return 'bg-orange-500';
      case 'delivered':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Agendada';
      case 'in_transit':
        return 'Em Trânsito';
      case 'delivered':
        return 'Entregue';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!delivery) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Entrega não encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Rastreamento Uber Direct
          </CardTitle>
          <Badge className={`${getStatusColor(delivery.status)} text-white`}>
            {getStatusText(delivery.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informações da Entrega */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">ID da Entrega:</span>
            <span className="font-mono">{delivery.id.slice(-8)}</span>
          </div>
          {delivery.uber_fee && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Custo da Entrega:</span>
              <span className="font-semibold">{formatCurrency(delivery.uber_fee)}</span>
            </div>
          )}
        </div>

        {/* Informações do Entregador */}
        {(delivery.uber_courier_name || delivery.uber_courier_phone) && (
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="font-semibold text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Informações do Entregador
            </div>
            {delivery.uber_courier_name && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Nome:</span>
                <span>{delivery.uber_courier_name}</span>
              </div>
            )}
            {delivery.uber_courier_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Telefone:</span>
                <a href={`tel:${delivery.uber_courier_phone}`} className="text-primary hover:underline">
                  {delivery.uber_courier_phone}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Localização do Entregador */}
        {delivery.uber_courier_location && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">
                Localização em tempo real disponível no rastreamento Uber
              </span>
            </div>
          </div>
        )}

        {/* Link de Rastreamento Uber */}
        {delivery.uber_tracking_url && (
          <Button
            onClick={() => window.open(delivery.uber_tracking_url, '_blank')}
            className="w-full"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Rastrear no Site da Uber
          </Button>
        )}

        {/* Status Detalhado */}
        {delivery.uber_status && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Status Uber: {delivery.uber_status.replace('deliveries.delivery_status.', '')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
