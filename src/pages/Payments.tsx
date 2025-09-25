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
import { useSupabasePayments } from "@/hooks/useSupabasePayments";
import { useSupabaseQuotes } from "@/hooks/useSupabaseQuotes";
import { getStatusColor, getStatusText } from "@/data/mockData";
import { PaymentDetailModal } from "@/components/payments/PaymentDetailModal";
import { CreatePaymentModal } from "@/components/payments/CreatePaymentModal";
import { PaymentCard } from "@/components/payments/PaymentCard";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAutomaticPayments } from "@/hooks/useAutomaticPayments";


export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

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

  const handleViewPayment = (payment: any) => {
    setSelectedPayment(payment);
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

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pagamentos</h1>
          <p className="text-muted-foreground">
            Gerencie pagamentos seguros com sistema de escrow
          </p>
        </div>
        <div className="flex gap-2">
          <CreatePaymentModal
            onPaymentCreate={async (quoteId: string, amount: number) => {
              try {
                // Buscar dados da cotação
                const quote = quotes.find(q => q.id === quoteId);
                if (!quote) {
                  toast.error('Cotação não encontrada');
                  throw new Error('Quote not found');
                }

                const { data, error } = await supabase
                  .from('payments')
                  .insert({
                    id: '', // Será gerado automaticamente pelo trigger
                    quote_id: quoteId,
                    client_id: quote.client_id,
                    supplier_id: quote.supplier_id || null,
                    amount: amount,
                    status: 'pending'
                  })
                  .select()
                  .single();
                
                if (error) throw error;
                
                toast.success('Pagamento criado com sucesso!');
                refetch();
                return data.id;
              } catch (error) {
                console.error('Error creating payment:', error);
                toast.error('Erro ao criar pagamento');
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

      {/* Filter Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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

      {/* Search and Filters */}
      <Card className="card-corporate">
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
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentPayments.map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                onPay={async (paymentId) => {
                  try {
                    const result = await createCheckoutSession(paymentId);
                    if (result?.url) {
                      window.location.href = result.url;
                    }
                  } catch (error) {
                    console.error('Payment error:', error);
                  }
                }}
                onConfirmDelivery={async (paymentId) => {
                  try {
                    await confirmDelivery(paymentId);
                  } catch (error) {
                    console.error('Delivery confirmation error:', error);
                  }
                }}
                onViewDetails={handleViewPayment}
              />
            ))}
          </div>
        )}

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
      </div>

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

      {/* Modals */}
      <PaymentDetailModal
        payment={selectedPayment}
        open={!!selectedPayment}
        onOpenChange={(open) => !open && setSelectedPayment(null)}
        onConfirmDelivery={() => {}}
        onReportDelay={() => {}}
        onOpenDispute={() => {}}
      />
    </div>
  );
}