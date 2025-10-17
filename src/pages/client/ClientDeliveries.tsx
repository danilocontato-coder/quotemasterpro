import { useState } from 'react';
import { Package, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeliveryMetrics } from '@/components/client/DeliveryMetrics';
import { DeliveryCard } from '@/components/client/DeliveryCard';
import { DeliveryConfirmationModal } from '@/components/supplier/DeliveryConfirmationModal';
import { useClientDeliveries, ClientDelivery } from '@/hooks/useClientDeliveries';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClientDeliveries() {
  const { deliveries, isLoading, refetch } = useClientDeliveries();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<ClientDelivery | null>(null);

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
              onConfirm={handleConfirm}
            />
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
