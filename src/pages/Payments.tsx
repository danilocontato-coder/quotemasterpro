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
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterMetricCard } from "@/components/ui/filter-metric-card";
import { PageLoader } from "@/components/ui/page-loader";
import { useSupabasePayments } from "@/hooks/useSupabasePayments";
import { useSupabaseQuotes } from "@/hooks/useSupabaseQuotes";
import { getStatusColor, getStatusText } from "@/data/mockData";
import { PaymentDetailModal } from "@/components/payments/PaymentDetailModal";
import { ReleaseEscrowModal } from "@/components/payments/ReleaseEscrowModal";
import { EscrowDashboard } from "@/components/payments/EscrowDashboard";
import { OfflinePaymentModal } from "@/components/payments/OfflinePaymentModal";
import { PaymentCard } from "@/components/payments/PaymentCard";
import { Badge } from "@/components/ui/badge";

import { DirectPaymentModal } from "@/components/payments/DirectPaymentModal";
import { PaymentsSyncStatus } from "@/components/payments/PaymentsSyncStatus";
import { AutoSyncIndicator } from "@/components/payments/AutoSyncIndicator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { supabase } from "@/integrations/supabase/client";
import { AnimatedHeader, AnimatedGrid, AnimatedSection } from '@/components/ui/animated-page';
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";


export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReleaseEscrowModal, setShowReleaseEscrowModal] = useState(false);
  const [showOfflinePaymentModal, setShowOfflinePaymentModal] = useState(false);
  const [selectedOfflinePayment, setSelectedOfflinePayment] = useState<any>(null);
  const [showDirectPaymentModal, setShowDirectPaymentModal] = useState(false);
  const [selectedDirectPayment, setSelectedDirectPayment] = useState<any>(null);
  const [supplierPaymentData, setSupplierPaymentData] = useState<{ 
    name: string; 
    pixKey: string | null; 
    bankData: any | null;
  } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  
  const { toast: showToast } = useToast();

  const {
    payments,
    isLoading,
    refetch,
    createCheckoutSession,
    confirmDelivery
  } = useSupabasePayments();
  
  const { quotes } = useSupabaseQuotes();
  
  // ✅ Buscar pagamentos apenas uma vez ao montar
  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependências vazias - executa apenas uma vez (refetch já está memoizado)

  // ✅ Filtrar apenas cobranças emitidas por fornecedores
  const supplierIssuedPayments = payments.filter(payment => payment.issued_by !== null);
  
  const filteredPayments = supplierIssuedPayments.filter(payment => {
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

  // Calculate metrics (apenas cobranças emitidas por fornecedores)
  const totalPayments = supplierIssuedPayments.length;
  const pendingPayments = supplierIssuedPayments.filter(p => p.status === "pending").length;
  const processingPayments = supplierIssuedPayments.filter(p => p.status === "processing").length;
  const completedPayments = supplierIssuedPayments.filter(p => p.status === "completed").length;
  const disputedPayments = supplierIssuedPayments.filter(p => p.status === "disputed").length;

  // Pagination calculations
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = filteredPayments.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter]);

  const handleConfirmDelivery = (payment: any) => {
    setSelectedPayment(payment);
    setShowReleaseEscrowModal(true);
  };

  const handleReleaseEscrow = async (notes: string, deliveryConfirmed: boolean) => {
    if (!selectedPayment) return;

    console.log('🔓 [UI] Iniciando liberação de escrow:', {
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

      console.log('📥 [UI] Resposta da edge function:', { data, error });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      console.log('✅ [UI] Escrow liberado com sucesso');

      showToast({
        title: "Fundos Liberados!",
        description: "O pagamento foi liberado e transferido ao fornecedor.",
      });

      refetch();
      setShowReleaseEscrowModal(false);
    } catch (error: any) {
      console.error('❌ [UI] Erro ao liberar escrow:', error);
      showToast({
        title: "Erro",
        description: error.message || "Não foi possível liberar os fundos",
        variant: "destructive",
      });
      throw error; // Re-throw para o modal não fechar
    }
  };

  const handleViewPayment = (payment: any) => {
    setSelectedPayment(payment);
  };

  const handleOfflinePayment = async (payment: any) => {
    // Fetch supplier data - pix_key is a separate column
    const { data: supplierData, error } = await supabase
      .from('suppliers')
      .select('name, pix_key, bank_data')
      .eq('id', payment.supplier_id)
      .single();

    if (error) {
      showToast({
        title: 'Erro ao carregar dados do fornecedor',
        description: 'Tente novamente',
        variant: 'destructive',
      });
      return;
    }

    // Check pix_key from dedicated column first, fallback to bank_data
    const pixKey = supplierData?.pix_key || (supplierData?.bank_data as any)?.pix_key;

    // Always open unified DirectPaymentModal
    setSupplierPaymentData({
      name: supplierData.name,
      pixKey: pixKey || null,
      bankData: supplierData.bank_data || null,
    });
    setSelectedDirectPayment(payment);
    setShowDirectPaymentModal(true);
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'in_escrow':
        return <ShieldCheck className="h-4 w-4" />;
      case 'waiting_confirmation':
        return <AlertTriangle className="h-4 w-4" />;
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'disputed':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const getDaysUntilRelease = (releaseDate: string) => {
    const release = new Date(releaseDate);
    const now = new Date();
    const diffTime = release.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
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
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
            Cobranças a Pagar
          </h1>
          <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
            Visualize e pague as cobranças emitidas pelos fornecedores
          </p>
        </div>
      </div>

      {/* Info Card - Novo Fluxo */}
      <Card className="border-primary/20 bg-primary/5 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Como funciona o novo fluxo de pagamentos?
              </p>
              <p className="text-sm text-muted-foreground">
                Após aprovar uma cotação, o <strong>fornecedor emite a cobrança</strong> com os dados da nota fiscal. 
                Você receberá uma notificação e poderá pagar diretamente pela plataforma com proteção de escrow.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Escrow Dashboard */}
      <EscrowDashboard payments={payments} />

      {/* Sync Status Monitor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <PaymentsSyncStatus />
        </div>
      </div>
      
      {/* ✅ FASE 4: Indicador automático de sync */}
      <AutoSyncIndicator />

      {/* Filter Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="animate-scale-in" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
          <FilterMetricCard
            title="Total"
            value={totalPayments}
            icon={<CreditCard />}
            isActive={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
            variant="default"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.15s', opacity: 0, animationFillMode: 'forwards' }}>
          <FilterMetricCard
            title="Pendente"
            value={pendingPayments}
            icon={<Clock />}
            isActive={activeFilter === "pending"}
            onClick={() => setActiveFilter("pending")}
            variant="warning"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
          <FilterMetricCard
            title="Processando"
            value={processingPayments}
            icon={<ShieldCheck />}
            isActive={activeFilter === "processing"}
            onClick={() => setActiveFilter("processing")}
            variant="default"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.25s', opacity: 0, animationFillMode: 'forwards' }}>
          <FilterMetricCard
            title="Concluídos"
            value={completedPayments}
            icon={<CheckCircle />}
            isActive={activeFilter === "completed"}
            onClick={() => setActiveFilter("completed")}
            variant="success"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
          <FilterMetricCard
            title="Disputas"
            value={disputedPayments}
            icon={<AlertTriangle />}
            isActive={activeFilter === "disputed"}
            onClick={() => setActiveFilter("disputed")}
            variant="destructive"
          />
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="card-corporate animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por ID, cotação, cliente ou fornecedor..."
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

      {/* Payments Grid */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentPayments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              onPay={async (paymentId) => {
                try {
                  const result = await createCheckoutSession(paymentId);
                  if (result?.url) {
                    try {
                      if (window.top && window.top !== window.self) {
                        window.top.location.href = result.url;
                      } else {
                        window.location.href = result.url;
                      }
                    } catch (e) {
                      window.open(result.url, '_blank', 'noopener,noreferrer');
                    }
                  }
                } catch (error) {
                  // Error already handled by toast
                }
              }}
              onConfirmDelivery={async (paymentId) => {
                try {
                  await confirmDelivery(paymentId);
                } catch (error) {
                  // Error already handled by toast
                }
              }}
              onViewDetails={handleViewPayment}
              onOfflinePayment={handleOfflinePayment}
            />
          ))}
        </div>

        {/* Pagination */}
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
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredPayments.length === 0 && (
        <Card className="card-corporate">
          <CardContent className="p-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm || activeFilter !== "all" 
                ? "Nenhuma cobrança encontrada"
                : "Aguardando cobranças dos fornecedores"
              }
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || activeFilter !== "all" 
                ? "Tente ajustar os filtros de busca"
                : "Após aprovar uma cotação, o fornecedor emitirá a cobrança e você será notificado"
              }
            </p>
          </CardContent>
        </Card>
      )}
      </div>


      <PaymentDetailModal
        payment={selectedPayment}
        open={!!selectedPayment}
        onOpenChange={(open) => !open && setSelectedPayment(null)}
        onConfirmDelivery={() => {}}
        onReportDelay={() => {}}
        onOpenDispute={() => {}}
      />

      <ReleaseEscrowModal
        open={showReleaseEscrowModal}
        onOpenChange={setShowReleaseEscrowModal}
        payment={selectedPayment}
        onConfirm={handleReleaseEscrow}
      />

      <OfflinePaymentModal
        payment={selectedOfflinePayment}
        open={showOfflinePaymentModal}
        onOpenChange={setShowOfflinePaymentModal}
        onConfirm={() => {
          refetch();
          toast.success('Pagamento offline registrado com sucesso!');
        }}
      />

      {/* Direct Payment Modal (unified PIX + manual) */}
      {selectedDirectPayment && supplierPaymentData && (
        <DirectPaymentModal
          isOpen={showDirectPaymentModal}
          onClose={() => {
            setShowDirectPaymentModal(false);
            setSelectedDirectPayment(null);
            setSupplierPaymentData(null);
          }}
          payment={{
            id: selectedDirectPayment.id,
            amount: selectedDirectPayment.amount,
            base_amount: selectedDirectPayment.base_amount,
            supplier_id: selectedDirectPayment.supplier_id || '',
            quotes: selectedDirectPayment.quotes,
          }}
          supplierName={supplierPaymentData.name}
          pixKey={supplierPaymentData.pixKey}
          bankData={supplierPaymentData.bankData}
          onSuccess={() => {
            refetch();
            setSelectedDirectPayment(null);
            setSupplierPaymentData(null);
          }}
        />
      )}
    </div>
  );
}