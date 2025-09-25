import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Package, Truck, Calendar, MapPin, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Delivery {
  id: string;
  quote_id: string;
  status: string;
  scheduled_date?: string;
  tracking_code?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  payments?: {
    amount: number;
    quotes?: {
      title: string;
      client_name: string;
    };
  };
}

export default function SupplierDeliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const { toast } = useToast();

  const fetchDeliveries = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          payments!inner(
            amount,
            quotes!inner(title, client_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Deliveries fetch error:', error);
        throw error;
      }
      
      setDeliveries((data as any) || []);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      toast({
        title: "Erro ao carregar entregas",
        description: "Não foi possível carregar a lista de entregas.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateDeliveryStatus = async (deliveryId: string, status: string, updates: any = {}) => {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({
          status,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (error) throw error;

      toast({
        title: "Entrega atualizada",
        description: "Status da entrega atualizado com sucesso.",
      });

      fetchDeliveries();
      setSelectedDelivery(null);
    } catch (error) {
      console.error('Error updating delivery:', error);
      toast({
        title: "Erro ao atualizar entrega",
        description: "Não foi possível atualizar o status da entrega.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchDeliveries();

    // Real-time subscription
    const channel = supabase
      .channel('deliveries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries'
        },
        () => {
          fetchDeliveries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'scheduled': return 'bg-blue-500';
      case 'in_transit': return 'bg-orange-500';
      case 'delivered': return 'bg-green-500';
      case 'auto_released': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Aguardando';
      case 'scheduled': return 'Agendada';
      case 'in_transit': return 'Em Trânsito';
      case 'delivered': return 'Entregue';
      case 'auto_released': return 'Liberado Automaticamente';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  // Calcular métricas
  const pendingCount = deliveries.filter(d => d.status === 'pending').length;
  const todayDeliveries = deliveries.filter(d => {
    if (!d.scheduled_date) return false;
    const today = new Date().toDateString();
    return new Date(d.scheduled_date).toDateString() === today;
  }).length;
  const inTransitCount = deliveries.filter(d => d.status === 'in_transit').length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Entregas</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Entregas
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas entregas e registre confirmações
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregas Pendentes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando agendamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregas Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              Agendadas para hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Trânsito</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inTransitCount}</div>
            <p className="text-xs text-muted-foreground">
              A caminho do destino
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de entregas */}
      {deliveries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma entrega encontrada</h3>
            <p className="text-muted-foreground text-center">
              Quando houver pagamentos confirmados, as entregas aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Entrega #{delivery.id.slice(-6)}
                  </CardTitle>
                  <Badge className={`${getStatusColor(delivery.status)} text-white`}>
                    {getStatusText(delivery.status)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cotação</p>
                    <p className="font-medium">#{delivery.quote_id}</p>
                    {delivery.payments?.quotes && (
                      <p className="text-sm text-muted-foreground">
                        {delivery.payments.quotes.title}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">
                      {delivery.payments?.quotes?.client_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="font-bold">
                      {delivery.payments ? formatCurrency(delivery.payments.amount) : 'N/A'}
                    </p>
                  </div>
                </div>

                {delivery.tracking_code && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        Código de Rastreamento: {delivery.tracking_code}
                      </span>
                    </div>
                  </div>
                )}

                {delivery.scheduled_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Agendada para: {new Date(delivery.scheduled_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {delivery.status === 'pending' && (
                    <Button
                      onClick={() => setSelectedDelivery(delivery)}
                      size="sm"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Agendar Entrega
                    </Button>
                  )}

                  {delivery.status === 'scheduled' && (
                    <Button
                      onClick={() => updateDeliveryStatus(delivery.id, 'in_transit', {
                        tracking_code: `TRK${Date.now()}`
                      })}
                      size="sm"
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Iniciar Transporte
                    </Button>
                  )}

                  {delivery.status === 'in_transit' && (
                    <Button
                      onClick={() => setSelectedDelivery(delivery)}
                      variant="outline"
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar como Entregue
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de agendamento/conclusão */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {selectedDelivery.status === 'pending' ? 'Agendar Entrega' : 'Concluir Entrega'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDelivery.status === 'pending' && (
                <>
                  <div>
                    <Label htmlFor="scheduledDate">Data da Entrega</Label>
                    <Input
                      id="scheduledDate"
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="deliveryNotes">Observações</Label>
                    <Textarea
                      id="deliveryNotes"
                      placeholder="Informações sobre a entrega..."
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                    />
                  </div>
                </>
              )}

              {selectedDelivery.status === 'in_transit' && (
                <div>
                  <Label htmlFor="finalNotes">Observações da Entrega</Label>
                  <Textarea
                    id="finalNotes"
                    placeholder="Detalhes sobre a entrega realizada..."
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedDelivery(null)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (selectedDelivery.status === 'pending') {
                      updateDeliveryStatus(selectedDelivery.id, 'scheduled', {
                        scheduled_date: scheduledDate || new Date().toISOString(),
                        delivery_notes: deliveryNotes
                      });
                    } else {
                      updateDeliveryStatus(selectedDelivery.id, 'delivered', {
                        delivered_date: new Date().toISOString(),
                        delivery_notes: deliveryNotes
                      });
                    }
                    setScheduledDate("");
                    setDeliveryNotes("");
                  }}
                  className="flex-1"
                  disabled={selectedDelivery.status === 'pending' && !scheduledDate}
                >
                  {selectedDelivery.status === 'pending' ? 'Agendar' : 'Finalizar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}