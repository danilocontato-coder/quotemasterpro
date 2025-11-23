import { useState, useEffect } from 'react';
import { Package, Search, Filter, Clock, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeliveryMetrics } from '@/components/client/DeliveryMetrics';
import { DeliveryCard } from '@/components/client/DeliveryCard';
import { DeliveryConfirmationModal } from '@/components/supplier/DeliveryConfirmationModal';
import { useClientDeliveries, ClientDelivery } from '@/hooks/useClientDeliveries';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function ClientDeliveries() {
  const { deliveries, isLoading, refetch } = useClientDeliveries();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<ClientDelivery | null>(null);
  const [awaitingScheduling, setAwaitingScheduling] = useState<any[]>([]);
  const [resendingCode, setResendingCode] = useState<string | null>(null);

  const handleConfirm = (deliveryId: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (delivery) {
      setSelectedDelivery(delivery);
      setShowConfirmModal(true);
    }
  };

  const handleConfirmed = () => {
    refetch();
    setSelectedDelivery(null);
  };

  const handleResendCode = async (deliveryId: string) => {
    try {
      setResendingCode(deliveryId);
      
      const { data, error } = await supabase.functions.invoke('resend-delivery-code', {
        body: { delivery_id: deliveryId }
      });

      if (error) throw error;

      toast({
        title: "Código reenviado",
        description: data.message || "O código de confirmação foi reenviado com sucesso",
      });
    } catch (error: any) {
      console.error('Error resending code:', error);
      toast({
        title: "Erro ao reenviar código",
        description: error.message || "Não foi possível reenviar o código. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setResendingCode(null);
    }
  };

  // Buscar cotações com pagamento confirmado mas sem entrega agendada
  useEffect(() => {
    const fetchAwaitingScheduling = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (!profile?.client_id) return;

      const { data: payments } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          status,
          quote_id,
          quotes!inner (
            id,
            local_code,
            title
          ),
          suppliers!supplier_id!inner (
            name
          )
        `)
        .eq('quotes.client_id', profile.client_id)
        .eq('status', 'in_escrow');

      if (!payments) return;

      // Filtrar apenas os que não têm delivery
      const pending = [];
      for (const payment of payments) {
        const { data: delivery } = await supabase
          .from('deliveries')
          .select('id')
          .eq('quote_id', payment.quote_id)
          .maybeSingle();

        if (!delivery) {
          pending.push({
            quote_id: payment.quote_id,
            quote_local_code: payment.quotes?.local_code,
            quote_title: payment.quotes?.title,
            supplier_name: payment.suppliers?.name,
            payment_amount: payment.amount,
          });
        }
      }

      setAwaitingScheduling(pending);
    };

    fetchAwaitingScheduling();

    // Subscribe to changes
    const channel = supabase
      .channel('client-awaiting-scheduling')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        () => fetchAwaitingScheduling()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => fetchAwaitingScheduling()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = !searchTerm || 
      delivery.quote_local_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.quote_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8" />
          Minhas Entregas
        </h1>
        <p className="text-muted-foreground">
          Acompanhe o status das suas entregas e confirme recebimentos para liberar pagamentos
        </p>
      </div>

      {/* Metrics */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <DeliveryMetrics deliveries={deliveries} />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cotação, fornecedor ou código de rastreio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pending">Aguardando</SelectItem>
            <SelectItem value="scheduled">Agendadas</SelectItem>
            <SelectItem value="in_transit">Em Trânsito</SelectItem>
            <SelectItem value="delivered">Entregues</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Awaiting Scheduling Cards */}
      {awaitingScheduling.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            Aguardando Agendamento
          </h3>
          {awaitingScheduling.map((item) => (
            <div
              key={item.quote_id}
              className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-4"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-yellow-600" />
                <div className="flex-1">
                  <p className="font-semibold">
                    Cotação #{item.quote_local_code} - {item.quote_title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Fornecedor: {item.supplier_name}
                  </p>
                  <p className="text-sm text-yellow-800 mt-1">
                    💰 Pagamento confirmado. O fornecedor está preparando a entrega.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deliveries List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm || statusFilter !== 'all' 
              ? 'Nenhuma entrega encontrada' 
              : 'Nenhuma entrega ainda'}
          </h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Suas entregas aparecerão aqui quando os fornecedores agendarem'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredDeliveries.map((delivery) => (
                <div className="space-y-2">
                  <DeliveryCard
                    key={delivery.id}
                    delivery={delivery}
                    onConfirm={handleConfirm}
                  />
                  {delivery.status === 'scheduled' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendCode(delivery.id)}
                      disabled={resendingCode === delivery.id}
                      className="w-full"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {resendingCode === delivery.id ? 'Reenviando...' : 'Reenviar Código de Confirmação'}
                    </Button>
                  )}
                </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <DeliveryConfirmationModal
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        onConfirmed={handleConfirmed}
      />
    </div>
  );
}
