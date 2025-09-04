import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, Calendar, MapPin, Clock } from 'lucide-react';
import { useSupabaseDeliveries } from '@/hooks/useSupabaseDeliveries';
import { CreateDeliveryModal } from '@/components/supplier/CreateDeliveryModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors = {
  scheduled: 'bg-blue-500',
  in_transit: 'bg-yellow-500', 
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500'
};

const statusLabels = {
  scheduled: 'Agendada',
  in_transit: 'Em Trânsito',
  delivered: 'Entregue',
  cancelled: 'Cancelada'
};

export default function SupplierDeliveries() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { deliveries, loading, createDelivery, updateDeliveryStatus, getDeliveryMetrics } = useSupabaseDeliveries();
  
  const metrics = getDeliveryMetrics();

  const handleCreateDelivery = async (deliveryData: any) => {
    await createDelivery(deliveryData);
  };

  const handleStatusUpdate = async (deliveryId: string, newStatus: any) => {
    await updateDeliveryStatus(deliveryId, newStatus);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando entregas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Entregas</h1>
          <p className="text-muted-foreground">
            Gerencie suas entregas e registre confirmações
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Truck className="mr-2 h-4 w-4" />
          Nova Entrega
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregas Pendentes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pending}</div>
            <p className="text-xs text-muted-foreground">
              Agendadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregas Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.todayDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              Programadas para hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Trânsito</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.inTransit}</div>
            <p className="text-xs text-muted-foreground">
              A caminho do destino
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entregas</CardTitle>
          <CardDescription>
            {deliveries.length > 0 
              ? `${deliveries.length} entrega(s) cadastrada(s)`
              : 'Nenhuma entrega cadastrada'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deliveries.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">Nenhuma entrega</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Cadastre sua primeira entrega para começar
              </p>
              <div className="mt-6">
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Truck className="mr-2 h-4 w-4" />
                  Nova Entrega
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {deliveries.map((delivery) => (
                <div key={delivery.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-2 h-2 ${statusColors[delivery.status]} rounded-full`}></div>
                    <div>
                      <p className="font-medium">Cotação #{delivery.quote_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {delivery.delivery_address}
                      </p>
                      {delivery.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {delivery.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(delivery.scheduled_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {statusLabels[delivery.status]}
                      </Badge>
                    </div>
                    {delivery.status === 'scheduled' && (
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStatusUpdate(delivery.id, 'in_transit')}
                        >
                          Iniciar
                        </Button>
                      </div>
                    )}
                    {delivery.status === 'in_transit' && (
                      <Button 
                        size="sm"
                        onClick={() => handleStatusUpdate(delivery.id, 'delivered')}
                      >
                        Entregar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateDeliveryModal 
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onDeliveryCreated={handleCreateDelivery}
      />
    </div>
  );
}