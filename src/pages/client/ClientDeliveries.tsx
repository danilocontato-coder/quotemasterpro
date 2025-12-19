import { useState, useEffect } from 'react';
import { Package, Search, Filter, Clock, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeliveryMetrics } from '@/components/client/DeliveryMetrics';
import { DeliveryCard } from '@/components/client/DeliveryCard';
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
  const [awaitingScheduling, setAwaitingScheduling] = useState<any[]>([]);
  const [resendingCode, setResendingCode] = useState<string | null>(null);

  // Cliente não confirma mais - apenas passa o código para o fornecedor
  const handleViewCode = (deliveryId: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (delivery?.confirmation_code) {
      toast({
        title: "📋 Código de Confirmação",
        description: `Informe este código ao entregador: ${delivery.confirmation_code}`,
        duration: 10000,
      });
    }
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

  // Buscar entregas pendentes (status='pending') - criadas pelo trigger mas ainda não agendadas
  useEffect(() => {
    const fetchAwaitingScheduling = async () => {
      if (!user?.clientId) return;

      const { data } = await supabase
        .from('deliveries')
        .select(`
          id,
          quote_id,
          quotes!inner(local_code, title),
          payments!inner(amount),
          suppliers!deliveries_supplier_id_fkey!inner(name)
        `)
        .eq('client_id', user.clientId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const formatted = (data || []).map((d: any) => ({
        quote_id: d.quote_id,
        quote_local_code: d.quotes.local_code,
        quote_title: d.quotes.title,
        supplier_name: d.suppliers.name,
        payment_amount: d.payments.amount,
      }));

      setAwaitingScheduling(formatted);
    };

    fetchAwaitingScheduling();

    // Subscribe to changes
    const channel = supabase
      .channel('client-awaiting-scheduling')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'deliveries',
          filter: `client_id=eq.${user?.clientId}`
        },
        () => fetchAwaitingScheduling()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.clientId]);

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
          Acompanhe o status das suas entregas. Ao receber, informe o código de confirmação ao entregador.
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
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              onConfirm={handleViewCode}
              onResendCode={handleResendCode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
