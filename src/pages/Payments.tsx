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
import { usePayments } from "@/hooks/usePayments";
import { getStatusColor, getStatusText } from "@/data/mockData";
import { PaymentDetailModal } from "@/components/payments/PaymentDetailModal";
import { CreatePaymentModal } from "@/components/payments/CreatePaymentModal";

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const {
    payments,
    confirmDelivery,
    reportDelay,
    openDispute,
    cancelPayment,
    createPayment,
    getPaymentsByStatus,
  } = usePayments();

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.quoteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (activeFilter === "pending") {
      matchesFilter = payment.status === "pending";
    } else if (activeFilter === "in_escrow") {
      matchesFilter = payment.status === "in_escrow";
    } else if (activeFilter === "waiting_confirmation") {
      matchesFilter = payment.status === "waiting_confirmation";
    } else if (activeFilter === "paid") {
      matchesFilter = payment.status === "paid";
    } else if (activeFilter === "disputed") {
      matchesFilter = payment.status === "disputed";
    } else if (activeFilter === "cancelled") {
      matchesFilter = payment.status === "cancelled";
    }
    
    return matchesSearch && matchesFilter;
  });

  // Calculate metrics
  const totalPayments = payments.length;
  const pendingPayments = payments.filter(p => p.status === "pending").length;
  const inEscrowPayments = payments.filter(p => p.status === "in_escrow").length;
  const waitingConfirmationPayments = payments.filter(p => p.status === "waiting_confirmation").length;
  const paidPayments = payments.filter(p => p.status === "paid").length;
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
            onPaymentCreate={createPayment}
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
          title="Em Garantia"
          value={inEscrowPayments}
          icon={<ShieldCheck />}
          isActive={activeFilter === "in_escrow"}
          onClick={() => setActiveFilter("in_escrow")}
          variant="default"
        />
        <FilterMetricCard
          title="Aguardando"
          value={waitingConfirmationPayments}
          icon={<AlertTriangle />}
          isActive={activeFilter === "waiting_confirmation"}
          onClick={() => setActiveFilter("waiting_confirmation")}
          variant="warning"
        />
        <FilterMetricCard
          title="Pagos"
          value={paidPayments}
          icon={<CheckCircle />}
          isActive={activeFilter === "paid"}
          onClick={() => setActiveFilter("paid")}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentPayments.map((payment) => {
            const statusColor = getStatusColor(payment.status);
            const daysUntilRelease = getDaysUntilRelease(payment.escrowReleaseDate);
            
            return (
              <Card key={payment.id} className="card-corporate hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{payment.quoteName}</CardTitle>
                        {getPaymentStatusIcon(payment.status)}
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">
                        {payment.id}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                      {getStatusText(payment.status)}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Payment Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-semibold text-lg text-primary">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-medium">{payment.clientName}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Fornecedor:</span>
                      <span className="font-medium">{payment.supplierName}</span>
                    </div>
                  </div>

                  {/* Escrow Info */}
                  {(payment.status === 'in_escrow' || payment.status === 'waiting_confirmation') && (
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Liberação automática:</span>
                        <span className={`font-medium ${daysUntilRelease <= 3 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                          {daysUntilRelease > 0 ? `${daysUntilRelease} dias` : 'Hoje'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleViewPayment(payment)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                    
                    {payment.status === 'waiting_confirmation' && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleViewPayment(payment)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirmar Entrega
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleViewPayment(payment)}
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Abrir Disputa
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
              <CreatePaymentModal
                onPaymentCreate={createPayment}
                trigger={
                  <Button className="btn-corporate">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Pagamento
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <PaymentDetailModal
        payment={selectedPayment}
        open={!!selectedPayment}
        onOpenChange={(open) => !open && setSelectedPayment(null)}
        onConfirmDelivery={confirmDelivery}
        onReportDelay={reportDelay}
        onOpenDispute={openDispute}
      />
    </div>
  );
}