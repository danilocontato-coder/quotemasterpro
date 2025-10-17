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
  AlertTriangle
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
import { CreatePaymentModal } from "@/components/payments/CreatePaymentModal";
import { ReleaseEscrowModal } from "@/components/payments/ReleaseEscrowModal";
import { EscrowDashboard } from "@/components/payments/EscrowDashboard";
import { OfflinePaymentModal } from "@/components/payments/OfflinePaymentModal";
import { PaymentCard } from "@/components/payments/PaymentCard";
import { CreateAsaasWalletTest } from "@/components/debug/CreateAsaasWalletTest";
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
import { useAutomaticPayments } from "@/hooks/useAutomaticPayments";
import { useToast } from "@/hooks/use-toast";


export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReleaseEscrowModal, setShowReleaseEscrowModal] = useState(false);
  const [showOfflinePaymentModal, setShowOfflinePaymentModal] = useState(false);
  const [selectedOfflinePayment, setSelectedOfflinePayment] = useState<any>(null);
  const [showOfflinePaymentAlert, setShowOfflinePaymentAlert] = useState(false);
  const [pendingOfflinePayment, setPendingOfflinePayment] = useState<any>(null);

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
  
  // Enable automatic payment creation for approved quotes
  useAutomaticPayments();

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

  // Calculate metrics
  const totalPayments = payments.length;
  const pendingPayments = payments.filter(p => p.status === "pending").length;
  const processingPayments = payments.filter(p => p.status === "processing").length;
  const completedPayments = payments.filter(p => p.status === "completed").length;
  const disputedPayments = payments.filter(p => p.status === "disputed").length;

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

    try {
      const { data, error } = await supabase.functions.invoke('release-escrow-payment', {
        body: {
          paymentId: selectedPayment.id,
          deliveryConfirmed,
          notes,
        },
      });

      if (error) throw error;

      showToast({
        title: "Fundos Liberados!",
        description: "O pagamento foi liberado e transferido ao fornecedor.",
      });

      refetch();
      setShowReleaseEscrowModal(false);
    } catch (error: any) {
      showToast({
        title: "Erro",
        description: error.message || "Não foi possível liberar os fundos",
        variant: "destructive",
      });
    }
  };

  const handleViewPayment = (payment: any) => {
    setSelectedPayment(payment);
  };

  const handleOfflinePayment = (payment: any) => {
    setPendingOfflinePayment(payment);
    setShowOfflinePaymentAlert(true);
  };

  const handleConfirmOfflinePayment = () => {
    setSelectedOfflinePayment(pendingOfflinePayment);
    setShowOfflinePaymentModal(true);
    setShowOfflinePaymentAlert(false);
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
            Pagamentos
          </h1>
          <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
            Gerencie pagamentos seguros com sistema de escrow
          </p>
        </div>
        <div className="flex gap-2 animate-fade-in" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
          <CreatePaymentModal
            onPaymentCreate={async (quoteId: string, amount: number) => {
              try {
                // Buscar dados completos da cotação incluindo itens
                const { data: quoteData, error: quoteError } = await supabase
                  .from('quotes')
                  .select(`
                    *,
                    quote_items(quantity, unit_price)
                  `)
                  .eq('id', quoteId)
                  .single();

                if (quoteError || !quoteData) {
                  toast.error('Cotação não encontrada');
                  throw new Error('Quote not found');
                }

                // Calcular total real da cotação
                let totalAmount = quoteData.total || 0;
                
                // Se total for zero, calcular a partir dos itens
                if (totalAmount === 0 && quoteData.quote_items?.length > 0) {
                  totalAmount = quoteData.quote_items.reduce((sum: number, item: any) => {
                    return sum + ((item.quantity || 0) * (item.unit_price || 0));
                  }, 0);
                }

                // Validar valor mínimo
                if (totalAmount <= 0) {
                  toast.error('O valor do pagamento deve ser maior que zero. Verifique se a cotação possui itens válidos.');
                  throw new Error('Invalid payment amount');
                }

                // Criar pagamento (ID será gerado automaticamente pelo trigger)
                const { data, error } = await supabase
                  .from('payments')
                  .insert({
                    quote_id: quoteId,
                    client_id: quoteData.client_id,
                    supplier_id: quoteData.supplier_id || null,
                    amount: totalAmount,
                    status: 'pending'
                  } as any)
                  .select()
                  .single();
                
                if (error) {
                  throw error;
                }
                
                toast.success(`Pagamento ${data.id} criado com sucesso no valor de R$ ${totalAmount.toFixed(2)}`);
                refetch();
                return data.id;
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Erro ao criar pagamento');
                throw error;
              }
            }}
            trigger={
              <Button className="btn-corporate">
                <Plus className="h-4 w-4 mr-2" />
                Novo Pagamento
              </Button>
            }
          />
        </div>
      </div>

      {/* Escrow Dashboard */}
      <EscrowDashboard payments={payments} />

      {/* Debug: Create Asaas Wallet */}
      <CreateAsaasWalletTest />

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
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum pagamento encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || activeFilter !== "all" 
                ? "Tente ajustar os filtros de busca"
                : "Comece criando seu primeiro pagamento"
              }
            </p>
            {!searchTerm && activeFilter === "all" && (
              <Button className="btn-corporate">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Pagamento
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      </div>

      {/* Modals */}
      <AlertDialog open={showOfflinePaymentAlert} onOpenChange={setShowOfflinePaymentAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              Pagar pela Plataforma é Mais Seguro
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-base">
              <p>
                <strong>Recomendamos fortemente que você pague através da nossa plataforma.</strong> 
                Isso garante proteção para ambas as partes.
              </p>
              <p className="text-amber-600 font-medium">
                ⚠️ Ao pagar diretamente ao fornecedor, você perde:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Proteção contra fraudes e disputas</li>
                <li>Garantia de escrow (pagamento retido até entrega)</li>
                <li>Suporte da plataforma em caso de problemas</li>
                <li>Registro automático e comprovação de pagamento</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                Apenas continue se você já realizou o pagamento diretamente ao fornecedor e precisa informar isso.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmOfflinePayment}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Já Paguei Direto ao Fornecedor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </div>
  );
}