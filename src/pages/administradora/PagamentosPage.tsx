import { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  Eye, 
  CreditCard, 
  Clock, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle, 
  AlertTriangle,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterMetricCard } from "@/components/ui/filter-metric-card";
import { PageLoader } from "@/components/ui/page-loader";
import { ClientContextSwitcher } from "@/components/layout/ClientContextSwitcher";
import { useAdministradoraPayments } from "@/hooks/useAdministradoraPayments";
import { useAdministradora } from "@/contexts/AdministradoraContext";
import { getStatusColor, getStatusText } from "@/data/mockData";
import { PaymentDetailModal } from "@/components/payments/PaymentDetailModal";
import { CreatePaymentModal } from "@/components/payments/CreatePaymentModal";
import { ReleaseEscrowModal } from "@/components/payments/ReleaseEscrowModal";
import { EscrowDashboard } from "@/components/payments/EscrowDashboard";
import { PaymentCard } from "@/components/payments/PaymentCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PagamentosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReleaseEscrowModal, setShowReleaseEscrowModal] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  
  const { payments, isLoading, isRefetching, refetch, createCheckoutSession, confirmDelivery } = useAdministradoraPayments();
  const { currentClientId, condominios } = useAdministradora();

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      (payment.quote_id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (activeFilter === "pending") {
      matchesFilter = payment.status === "pending";
    } else if (activeFilter === "processing") {
      matchesFilter = payment.status === "processing";
    } else if (activeFilter === "completed") {
      matchesFilter = payment.status === "completed";
    } else if (activeFilter === "failed") {
      matchesFilter = payment.status === "failed";
    } else if (activeFilter === "disputed") {
      matchesFilter = payment.status === "disputed";
    }
    
    return matchesSearch && matchesFilter;
  });

  const totalPayments = payments.length;
  const pendingPayments = payments.filter(p => p.status === "pending").length;
  const processingPayments = payments.filter(p => p.status === "processing").length;
  const completedPayments = payments.filter(p => p.status === "completed").length;
  const disputedPayments = payments.filter(p => p.status === "disputed").length;

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = filteredPayments.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter]);

  const handleConfirmDelivery = (payment: any) => {
    setSelectedPayment(payment);
    setShowReleaseEscrowModal(true);
  };

  const handleReleaseEscrow = async (notes: string, deliveryConfirmed: boolean) => {
    if (!selectedPayment) return;

    console.log('🔓 [ADMIN-UI] Iniciando liberação de escrow:', {
      paymentId: selectedPayment.id,
      localCode: selectedPayment.local_code,
      deliveryConfirmed,
      notes
    });

    try {
      const { data, error } = await supabase.functions.invoke('release-escrow-payment', {
        body: {
          paymentId: selectedPayment.id,
          deliveryConfirmed,
          notes,
        },
      });

      console.log('📥 [ADMIN-UI] Resposta da edge function:', { data, error });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      console.log('✅ [ADMIN-UI] Escrow liberado com sucesso');

      toast.success("Fundos liberados com sucesso!");
      refetch();
      setShowReleaseEscrowModal(false);
    } catch (error: any) {
      console.error('❌ [ADMIN-UI] Erro ao liberar escrow:', error);
      toast.error(error.message || "Não foi possível liberar os fundos");
      throw error; // Re-throw para o modal não fechar
    }
  };

  const handleViewPayment = (payment: any) => {
    setSelectedPayment(payment);
  };

  const getCondominioName = (clientId: string) => {
    const condo = condominios.find(c => c.id === clientId);
    return condo?.name || 'Administradora';
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // Mostrar loader completo apenas no primeiro carregamento
  if (isLoading && payments.length === 0) {
    return (
      <PageLoader
        hasHeader={true}
        hasMetrics={true}
        hasSearch={true}
        hasGrid={true}
        gridColumns={3}
        metricsCount={5}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ Indicador sutil de refetch em background */}
      {isRefetching && (
        <div className="fixed top-4 right-4 z-50">
          <div className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 rounded-full shadow-lg">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-xs">Atualizando...</span>
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Pagamentos</h1>
          <p className="text-muted-foreground">
            Gerencie pagamentos seguros dos condomínios com sistema de escrow
          </p>
        </div>
        <div className="flex gap-2">
          <ClientContextSwitcher />
        </div>
      </div>

      <EscrowDashboard payments={payments} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <FilterMetricCard
          title="Total"
          value={totalPayments}
          icon={<CreditCard />}
          isActive={activeFilter === "all"}
          onClick={() => setActiveFilter("all")}
          variant="default"
        />
        <FilterMetricCard
          title="Pendente"
          value={pendingPayments}
          icon={<Clock />}
          isActive={activeFilter === "pending"}
          onClick={() => setActiveFilter("pending")}
          variant="warning"
        />
        <FilterMetricCard
          title="Processando"
          value={processingPayments}
          icon={<ShieldCheck />}
          isActive={activeFilter === "processing"}
          onClick={() => setActiveFilter("processing")}
          variant="default"
        />
        <FilterMetricCard
          title="Concluídos"
          value={completedPayments}
          icon={<CheckCircle />}
          isActive={activeFilter === "completed"}
          onClick={() => setActiveFilter("completed")}
          variant="success"
        />
        <FilterMetricCard
          title="Disputas"
          value={disputedPayments}
          icon={<AlertTriangle />}
          isActive={activeFilter === "disputed"}
          onClick={() => setActiveFilter("disputed")}
          variant="destructive"
        />
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por ID, cotação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentPayments.map((payment) => (
            <div key={payment.id} className="relative">
              <div className="absolute -top-2 -right-2 z-10">
                <div className="flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">
                  <Building2 className="h-3 w-3" />
                  {getCondominioName(payment.client_id)}
                </div>
              </div>
              <PaymentCard
                payment={payment}
                onPay={async (paymentId) => {
                  try {
                    const result = await createCheckoutSession(paymentId);
                    if (result?.url) {
                      window.location.href = result.url;
                    }
                  } catch (error) {
                    // Error already handled
                  }
                }}
                onConfirmDelivery={async (paymentId) => {
                  try {
                    await confirmDelivery(paymentId);
                  } catch (error) {
                    // Error already handled
                  }
                }}
                onViewDetails={handleViewPayment}
                onOfflinePayment={() => {}}
              />
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredPayments.length)} de {filteredPayments.length} pagamentos
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-10"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedPayment && (
        <>
          <PaymentDetailModal
            payment={selectedPayment}
            open={!!selectedPayment}
            onOpenChange={(open) => !open && setSelectedPayment(null)}
          />
          <ReleaseEscrowModal
            open={showReleaseEscrowModal}
            onOpenChange={setShowReleaseEscrowModal}
            onConfirm={handleReleaseEscrow}
            payment={selectedPayment}
          />
        </>
      )}
    </div>
  );
}
