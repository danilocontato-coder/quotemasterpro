import { useState } from "react";
import { Plus, Search, Filter, Eye, Trash2, FileText, Edit, Archive, ChevronLeft, ChevronRight, Send, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterMetricCard } from "@/components/ui/filter-metric-card";
import { CreateQuoteModalSupabase } from "@/components/quotes/CreateQuoteModalSupabase";
import { DeleteConfirmationModal } from "@/components/quotes/DeleteConfirmationModal";
import { QuoteComparisonButton } from "@/components/quotes/QuoteComparisonButton";
import { DecisionMatrixManager } from "@/components/quotes/DecisionMatrixManager";
import { QuoteDetailModal } from "@/components/quotes/QuoteDetailModal";
import { StatusProgressIndicator } from "@/components/quotes/StatusProgressIndicator";
import { EconomyNotification, useEconomyAlerts } from "@/components/quotes/EconomyNotification";
import { SendQuoteToSuppliersModal } from "@/components/quotes/SendQuoteToSuppliersModal";
import { useSupabaseQuotes } from "@/hooks/useSupabaseQuotes";
import { useSupabaseSubscriptionGuard } from "@/hooks/useSupabaseSubscriptionGuard";
import { getStatusColor, getStatusText } from "@/utils/statusUtils";
import { toast } from "sonner";

export default function Quotes() {
  // Hooks no início para evitar erros TypeScript
  const { quotes, createQuote, updateQuote, deleteQuote, isLoading, error, markQuoteAsReceived, refetch } = useSupabaseQuotes();
  const { enforceLimit } = useSupabaseSubscriptionGuard();
  const { alerts, addAlert, markAsRead, dismissAlert } = useEconomyAlerts();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMatrixManagerOpen, setIsMatrixManagerOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<any | null>(null);
  const [viewingQuote, setViewingQuote] = useState<any | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<any | null>(null);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  console.log('🎯 Quotes page - Hook results (optimized):', {
    quotes: quotes?.length || 0,
    isLoading,
    error,
    hookCalled: true,
    timestamp: Date.now()
  });

  // Show error message if there's an error
  if (error && !isLoading) {
    console.error('❌ Error in quotes page:', error);
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-6 text-center">
          <p className="text-red-600">Erro ao carregar cotações: {error}</p>
          <Button onClick={refetch} className="mt-4">
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  const handleCreateQuote = async (quoteData: any) => {
    try {
      const canProceed = await enforceLimit("CREATE_QUOTE");
      if (!canProceed) return;

      await createQuote(quoteData);
      setIsCreateModalOpen(false);
      toast.success("Cotação criada com sucesso!");
    } catch (error) {
      console.error('Erro ao criar cotação:', error);
      toast.error("Erro ao criar cotação");
    }
  };

  const handleEditQuote = (quote: any) => {
    setEditingQuote(quote);
    setIsCreateModalOpen(true);
  };

  const handleUpdateQuote = async (id: string, updates: any) => {
    try {
      await updateQuote(id, updates);
      setIsCreateModalOpen(false);
      setEditingQuote(null);
      toast.success("Cotação atualizada com sucesso!");
    } catch (error) {
      console.error('Erro ao atualizar cotação:', error);
      toast.error("Erro ao atualizar cotação");
    }
  };

  const handleDeleteQuote = async () => {
    if (!quoteToDelete) return;

    try {
      await deleteQuote(quoteToDelete.id);
      setIsDeleteModalOpen(false);
      setQuoteToDelete(null);
      toast.success("Cotação excluída com sucesso!");
    } catch (error) {
      console.error('Erro ao excluir cotação:', error);
      toast.error("Erro ao excluir cotação");
    }
  };

  const handleMarkAsReceived = async (quoteId: string) => {
    try {
      await markQuoteAsReceived(quoteId);
      toast.success("Cotação marcada como recebida!");
    } catch (error) {
      console.error('Erro ao marcar cotação como recebida:', error);
      toast.error("Erro ao marcar cotação como recebida");
    }
  };

  // Filtrar cotações baseado no termo de busca e status
  const filteredQuotes = quotes?.filter((quote: any) => {
    const matchesSearch = quote.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    const matchesFilter = activeFilter === "all" || 
                         (activeFilter === "draft" && quote.status === "draft") ||
                         (activeFilter === "sent" && quote.status === "sent") ||
                         (activeFilter === "under_review" && quote.status === "under_review") ||
                         (activeFilter === "completed" && ["approved", "paid"].includes(quote.status)) ||
                         (activeFilter === "urgentes" && quotes?.some((q: any) => q.deadline && new Date(q.deadline) <= new Date(Date.now() + 24 * 60 * 60 * 1000))) ||
                         (activeFilter === "alta_economia" && quotes?.some((q: any) => q.total && q.total > 5000));

    return matchesSearch && matchesStatus && matchesFilter;
  });

  // Estatísticas para os cards de filtro
  const totalQuotes = quotes?.length || 0;
  const draftQuotes = quotes?.filter((q: any) => q.status === "draft").length || 0;
  const sentQuotes = quotes?.filter((q: any) => q.status === "sent").length || 0;
  const underReviewQuotes = quotes?.filter((q: any) => q.status === "under_review").length || 0;
  const completedQuotes = quotes?.filter((q: any) => ["approved", "paid"].includes(q.status)).length || 0;
  const urgentQuotes = quotes?.filter((q: any) => q.deadline && new Date(q.deadline) <= new Date(Date.now() + 24 * 60 * 60 * 1000)).length || 0;
  const highValueQuotes = quotes?.filter((q: any) => q.total && q.total > 5000).length || 0;

  // Calcular paginação
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedQuotes = filteredQuotes?.slice(startIndex, endIndex) || [];
  const totalPages = Math.ceil((filteredQuotes?.length || 0) / itemsPerPage);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Cotações</h1>
          <p className="text-muted-foreground">Gerencie suas cotações e propostas</p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Cotação
        </Button>
      </div>

      {/* Economy Alerts */}
      <EconomyNotification
        alerts={alerts}
        onMarkAsRead={markAsRead}
        onDismiss={dismissAlert}
        onViewDetails={() => {}}
      />

      {/* Filtros de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <FilterMetricCard
          title="Todas"
          value={totalQuotes}
          isActive={activeFilter === "all"}
          onClick={() => setActiveFilter("all")}
          icon={<FileText className="h-4 w-4" />}
        />
        <FilterMetricCard
          title="Rascunhos"
          value={draftQuotes}
          isActive={activeFilter === "draft"}
          onClick={() => setActiveFilter("draft")}
          icon={<Edit className="h-4 w-4" />}
          variant="secondary"
        />
        <FilterMetricCard
          title="Enviadas"
          value={sentQuotes}
          isActive={activeFilter === "sent"}
          onClick={() => setActiveFilter("sent")}
          icon={<Send className="h-4 w-4" />}
          variant="default"
        />
        <FilterMetricCard
          title="Em Análise"
          value={underReviewQuotes}
          isActive={activeFilter === "under_review"}
          onClick={() => setActiveFilter("under_review")}
          icon={<Eye className="h-4 w-4" />}
          variant="warning"
        />
        <FilterMetricCard
          title="Finalizadas"
          value={completedQuotes}
          isActive={activeFilter === "completed"}
          onClick={() => setActiveFilter("completed")}
          icon={<CheckCircle className="h-4 w-4" />}
          variant="success"
        />
        <FilterMetricCard
          title="Urgentes"
          value={urgentQuotes}
          isActive={activeFilter === "urgentes"}
          onClick={() => setActiveFilter("urgentes")}
          icon={<AlertCircle className="h-4 w-4" />}
          variant="destructive"
        />
        <FilterMetricCard
          title="Alta Economia"
          value={highValueQuotes}
          isActive={activeFilter === "alta_economia"}
          onClick={() => setActiveFilter("alta_economia")}
          icon={<Archive className="h-4 w-4" />}
          variant="secondary"
        />
      </div>

      {/* Busca e filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cotações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="w-full sm:w-auto">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsMatrixManagerOpen(true)}
            className="w-full sm:w-auto"
          >
            Matriz de Decisão
          </Button>
        </div>
      </div>

      {/* Lista de cotações */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredQuotes?.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma cotação encontrada</h3>
          <p className="text-muted-foreground mb-6">
            {searchTerm ? "Tente ajustar os filtros ou termo de busca." : "Crie sua primeira cotação para começar."}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira cotação
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedQuotes.map((quote: any) => (
            <Card key={quote.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-primary truncate">
                      {quote.title || `Cotação ${quote.id}`}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">ID: {quote.id}</p>
                  </div>
                  <Badge variant={getStatusColor(quote.status) as any} className="ml-2">
                    {getStatusText(quote.status)}
                  </Badge>
                </div>
                
                <StatusProgressIndicator status={quote.status} />
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Informações básicas */}
                <div className="space-y-2 text-sm">
                  {quote.client_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-medium truncate ml-2">{quote.client_name}</span>
                    </div>
                  )}
                  
                  {quote.supplier_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fornecedor:</span>
                      <span className="font-medium truncate ml-2">{quote.supplier_name}</span>
                    </div>
                  )}
                  
                  {quote.total && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-semibold text-primary">
                        R$ {quote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Itens:</span>
                    <span>{quote.items_count || 0}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Respostas:</span>
                    <span>{quote.responses_count || 0}</span>
                  </div>
                  
                  {quote.deadline && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prazo:</span>
                      <span className={`font-medium ${
                        new Date(quote.deadline) <= new Date(Date.now() + 24 * 60 * 60 * 1000) 
                          ? 'text-red-600' 
                          : ''
                      }`}>
                        {new Date(quote.deadline).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViewingQuote(quote);
                      setIsDetailModalOpen(true);
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditQuote(quote)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  
                  {(quote.status === 'sent' || quote.status === 'receiving') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsReceived(quote.id)}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Recebida
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuoteToDelete(quote);
                      setIsDeleteModalOpen(true);
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          
          <div className="flex space-x-1">
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
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Modais */}
      <CreateQuoteModalSupabase
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onQuoteCreate={editingQuote ? undefined : handleCreateQuote}
        editingQuote={editingQuote}
      />

      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDeleteQuote}
        quote={quoteToDelete}
      />

      <DecisionMatrixManager
        open={isMatrixManagerOpen}
        onClose={() => setIsMatrixManagerOpen(false)}
      />

      <QuoteDetailModal
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        quote={viewingQuote}
      />
    </div>
  );
}