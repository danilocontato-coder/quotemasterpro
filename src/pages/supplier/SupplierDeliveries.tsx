import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Truck, Calendar, MapPin, Clock, CheckCircle, Copy, Key, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { UberDeliveryForm } from "@/components/supplier/delivery/UberDeliveryForm";
import { PendingDeliveriesTab } from "@/components/supplier/PendingDeliveriesTab";
import { ScheduleDeliveryModal } from "@/components/supplier/ScheduleDeliveryModal";
import { PostPaymentActionModal } from "@/components/supplier/PostPaymentActionModal";
import { usePendingDeliveries } from "@/hooks/usePendingDeliveries";

// Componente para mostrar status de envio do código
const DeliveryCodeStatus = ({ deliveryId, clientEmail }: { deliveryId: string; clientEmail?: string }) => {
  return (
    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
      <div className="flex-1">
        <div className="text-sm font-medium text-green-900 dark:text-green-100">
          Código de Confirmação Enviado
        </div>
        <div className="text-xs text-green-700 dark:text-green-300">
          {clientEmail ? `Enviado para ${clientEmail} via e-mail e WhatsApp` : 'Enviado para o cliente via e-mail e WhatsApp'}
        </div>
      </div>
      <AlertCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
    </div>
  );
};

interface Delivery {
  id: string;
  quote_id: string;
  local_code?: string;
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
      local_code?: string;
      shipping_cost?: number;
    };
  };
}

export default function SupplierDeliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [selectedQuoteForSchedule, setSelectedQuoteForSchedule] = useState<string | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [postPaymentModal, setPostPaymentModal] = useState<{
    open: boolean;
    quoteData?: any;
  }>({ open: false });
  const [trackingCode, setTrackingCode] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const { pendingDeliveries } = usePendingDeliveries();

  const fetchDeliveries = async () => {
    try {
      setIsLoading(true);
      
      if (!user?.supplierId) {
        console.log('No supplier ID found');
        setDeliveries([]);
        return;
      }
      
      // Buscar entregas com local_code
      const { data: deliveriesData, error } = await supabase
        .from('deliveries')
        .select(`
          id,
          quote_id,
          local_code,
          status,
          scheduled_date,
          actual_delivery_date,
          tracking_code,
          notes,
          created_at,
          updated_at
        `)
        .eq('supplier_id', user.supplierId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Deliveries fetch error:', error);
        throw error;
      }

      const rows = deliveriesData || [];
      if (rows.length === 0) {
        setDeliveries([]);
        return;
      }

      // Buscar dados relacionados em lote para evitar N+1
      const quoteIds = Array.from(new Set(rows.map((d: any) => d.quote_id)));

      const [quotesRes, paymentsRes, quoteResponsesRes] = await Promise.all([
        supabase
          .from('quotes')
          .select('id, local_code, title, client_name, total')
          .in('id', quoteIds),
        supabase
          .from('payments')
          .select('quote_id, amount, status')
          .in('quote_id', quoteIds),
        supabase
          .from('quote_responses')
          .select('quote_id, shipping_cost')
          .in('quote_id', quoteIds)
          .eq('status', 'approved')
      ]);

      const quotes = (quotesRes.data || []) as Array<{ id: string; local_code: string; title: string; client_name: string; total: number }>;
      const payments = (paymentsRes.data || []) as Array<{ quote_id: string; amount: number; status: string }>;
      const quoteResponses = (quoteResponsesRes.data || []) as Array<{ quote_id: string; shipping_cost: number | null }>;

      const shippingMap = new Map<string, number>();
      for (const qr of quoteResponses) {
        shippingMap.set(qr.quote_id, qr.shipping_cost ?? 0);
      }

      const quoteMap = new Map(quotes.map((q) => [q.id, q]));

      // Escolher o pagamento mais relevante por cotação (prioridade: completed > in_escrow > pending)
      const priority: Record<string, number> = { completed: 3, in_escrow: 2, pending: 1 };
      const paymentsMap = new Map<string, { amount: number; status: string }>();
      for (const p of payments) {
        const current = paymentsMap.get(p.quote_id);
        if (!current || (priority[p.status] || 0) > (priority[current.status] || 0)) {
          paymentsMap.set(p.quote_id, { amount: p.amount, status: p.status });
        }
      }

      const deliveriesWithPayments: Delivery[] = rows.map((delivery: any) => {
        const quote = quoteMap.get(delivery.quote_id);
        const pay = paymentsMap.get(delivery.quote_id);
        const shipping = shippingMap.get(delivery.quote_id) ?? 0;
        
        return {
          ...delivery,
          payments: quote
            ? {
                amount: pay?.amount ?? quote.total ?? 0,
                quotes: { 
                  title: quote.title, 
                  client_name: quote.client_name,
                  local_code: quote.local_code,
                  shipping_cost: shipping
                }
              }
            : undefined
        } as Delivery;
      });

      setDeliveries(deliveriesWithPayments);
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
  }, [user?.supplierId]);

  const handleScheduleDelivery = (quoteId: string) => {
    setSelectedQuoteForSchedule(quoteId);
    setIsScheduleModalOpen(true);
  };

  const handleScheduleModalClose = () => {
    setIsScheduleModalOpen(false);
    setSelectedQuoteForSchedule(null);
  };
  
  const handleDeliveryScheduled = () => {
    fetchDeliveries();
    handleScheduleModalClose();
  };
  
  // Buscar dados da cotação para o modal
  const [quoteForModal, setQuoteForModal] = useState<any>(null);
  
  useEffect(() => {
    if (selectedQuoteForSchedule) {
      const loadQuoteData = async () => {
        const { data } = await supabase
          .from('quotes')
          .select('id, local_code, title, client_name, total')
          .eq('id', selectedQuoteForSchedule)
          .single();
        
        if (data) {
          setQuoteForModal(data);
        }
      };
      loadQuoteData();
    } else {
      setQuoteForModal(null);
    }
  }, [selectedQuoteForSchedule]);


  // Listener para notificações de pagamento confirmado
  useEffect(() => {
    const handlePaymentConfirmed = async (event: any) => {
      const { quoteId, amount } = event.detail;

      const { data: quote } = await supabase
        .from('quotes')
        .select('local_code, title, client_name')
        .eq('id', quoteId)
        .single();

      if (!quote) return;

      const dismissedQuotes = JSON.parse(
        localStorage.getItem('dismissed_payment_modals') || '[]'
      );

      if (!dismissedQuotes.includes(quote.local_code)) {
        setPostPaymentModal({
          open: true,
          quoteData: {
            quoteId,
            quoteLocalCode: quote.local_code,
            quoteTitle: quote.title,
            clientName: quote.client_name,
            paymentAmount: amount,
          },
        });
      }
    };

    window.addEventListener('payment-confirmed', handlePaymentConfirmed as EventListener);
    return () => window.removeEventListener('payment-confirmed', handlePaymentConfirmed as EventListener);
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
            Gerencie suas entregas e códigos de confirmação
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

      {/* Seção de Entregas Pendentes de Agendamento */}
      <PendingDeliveriesTab onScheduleDelivery={handleScheduleDelivery} />

      {/* Lista de entregas */}
      {deliveries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma entrega encontrada</h3>
            <p className="text-muted-foreground text-center">
              Quando houver recebimentos confirmados, as entregas aparecerão aqui.
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
                    Entrega {delivery.local_code || `#${delivery.id.slice(-6)}`}
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
                    <p className="font-medium">
                      {delivery.payments?.quotes?.local_code || `#${delivery.quote_id}`}
                    </p>
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
                    <p className="text-sm text-muted-foreground">Frete</p>
                    <div className="flex items-center gap-2">
                      {delivery.payments?.quotes?.shipping_cost === 0 ? (
                        <Badge variant="approved" className="text-xs">
                          Grátis
                        </Badge>
                      ) : (
                        <p className="font-medium">
                          {delivery.payments?.quotes?.shipping_cost 
                            ? formatCurrency(delivery.payments.quotes.shipping_cost) 
                            : 'N/A'}
                        </p>
                      )}
                    </div>
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

                {/* Mostrar status de envio do código quando entrega estiver agendada ou em trânsito */}
                {(delivery.status === 'scheduled' || delivery.status === 'in_transit') && (
                  <DeliveryCodeStatus deliveryId={delivery.id} />
                )}

                <div className="flex gap-2 pt-2">
                  {delivery.status === 'pending' && delivery.payments && (
                    <Button
                      onClick={() => setSelectedDelivery(delivery)}
                      size="sm"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Agendar Entrega
                    </Button>
                  )}

                  {delivery.status === 'pending' && !delivery.payments && (
                    <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                      Aguardando confirmação de pagamento
                    </div>
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

                  {delivery.status === 'delivered' && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Entrega confirmada pelo cliente</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal para agendar entrega a partir de pending deliveries */}
      {quoteForModal && (
        <ScheduleDeliveryModal
          quote={quoteForModal}
          open={isScheduleModalOpen}
          onOpenChange={handleScheduleModalClose}
          onDeliveryScheduled={handleDeliveryScheduled}
        />
      )}

      {/* Modal para atualizar entrega existente */}
      {selectedDelivery && selectedDelivery.status === 'pending' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-2xl my-8">
            <Card>
              <CardHeader>
                <CardTitle>Agendar Entrega</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="own" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="own">
                      <Truck className="h-4 w-4 mr-2" />
                      Entrega Própria
                    </TabsTrigger>
                    <TabsTrigger value="uber">
                      <Package className="h-4 w-4 mr-2" />
                      Entrega via Uber
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="own" className="space-y-4 mt-4">
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
                          updateDeliveryStatus(selectedDelivery.id, 'scheduled', {
                            scheduled_date: scheduledDate || new Date().toISOString(),
                            notes: deliveryNotes,
                            delivery_method: 'own'
                          });
                          setScheduledDate("");
                          setDeliveryNotes("");
                        }}
                        className="flex-1"
                        disabled={!scheduledDate}
                      >
                        Agendar
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="uber" className="mt-4">
                    <UberDeliveryForm
                      deliveryId={selectedDelivery.id}
                      onSuccess={() => {
                        setSelectedDelivery(null);
                        fetchDeliveries();
                      }}
                      onCancel={() => setSelectedDelivery(null)}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}