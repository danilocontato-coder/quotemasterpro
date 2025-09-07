import { useState, useEffect } from "react";
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
  const itemsPerPage = 6; // 6 cotações por página para visualização confortável
  
  const { quotes, createQuote, updateQuote, deleteQuote, isLoading, error, markQuoteAsReceived, refetch } = useSupabaseQuotes();
  const { enforceLimit } = useSupabaseSubscriptionGuard();
  const { alerts, addAlert, markAsRead, dismissAlert } = useEconomyAlerts();

  // Debug: verificar se o hook está sendo chamado
  console.log('🎯 Quotes page - Hook results:', {
    quotes: quotes?.length || 0,
    isLoading,
    error,
    hookCalled: true,
    quotesWithStatus: quotes?.map(q => ({ 
      id: q.id, 
      title: q.title,
      status: q.status, 
      responses_count: q.responses_count,
      suppliers_sent_count: q.suppliers_sent_count 
    }))
  });

  // Session health check - adicionar alertas para problemas de sessão
  useEffect(() => {
    if (error && error.includes('Sessão expirada')) {
      toast.error('Sua sessão expirou. Recarregue a página para fazer login novamente.');
    }
  }, [error]);

  // Force refresh button para debug
  const handleForceRefresh = () => {
    console.log('🔄 Force refresh triggered');
    refetch();
  };

  const handleQuoteCreate = async (quoteData: any) => {
    console.log('=== HANDLE QUOTE CREATE INICIADO ===');
    console.log('handleQuoteCreate called with:', quoteData);
    try {
      console.log('=== CHAMANDO createQuote ===');
      const newQuote = await createQuote(quoteData);
      console.log('=== createQuote RETORNOU ===');
      console.log('New quote created:', newQuote);
      if (newQuote) {
        console.log('=== SUCESSO - MOSTRANDO TOAST ===');
        toast.success(`Cotação criada com sucesso!`);
        setIsCreateModalOpen(false);
        setEditingQuote(null);
        return newQuote;
      } else {
        console.log('=== ERRO - createQuote retornou null ===');
        throw new Error('Failed to create quote');
      }
    } catch (error) {
      console.error('=== ERRO EM handleQuoteCreate ===', error);
      toast.error("Erro ao criar cotação");
      throw error;
    }
  };

  const handleQuoteUpdate = async (quoteData: any) => {
    console.log('handleQuoteUpdate called with:', quoteData);
    console.log('editingQuote:', editingQuote);
    
    if (editingQuote) {
      try {
        console.log('Calling updateQuote with ID:', editingQuote.id, 'and data:', quoteData);
        const result = await updateQuote(editingQuote.id, quoteData);
        console.log('Update result:', result);
        
        toast.success(`Cotação atualizada com sucesso!`);
        setEditingQuote(null);
        setIsCreateModalOpen(false);
      } catch (error) {
        console.error('Error updating quote:', error);
        toast.error("Erro ao atualizar cotação");
      }
    } else {
      console.error('No editingQuote found!');
      toast.error("Erro: cotação para edição não encontrada");
    }
  };

  const handleDeleteClick = (quote: any) => {
    setQuoteToDelete(quote);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (reason?: string) => {
    if (quoteToDelete) {
      try {
        await deleteQuote(quoteToDelete.id, reason);
        const action = quoteToDelete.status === 'draft' ? 'excluída' : 'cancelada';
        toast.success(`Cotação ${action} com sucesso!`);
        setQuoteToDelete(null);
      } catch (error) {
        toast.error("Erro ao excluir cotação");
      }
    }
  };

  const handleEditClick = (quote: any) => {
    setEditingQuote(quote);
    setIsCreateModalOpen(true);
  };

  const handleViewClick = (quote: any) => {
    setViewingQuote(quote);
    setIsDetailModalOpen(true);
  };

  const handleMarkAsReceived = async (quote: any) => {
    if (quote.status === 'approved') {
      await markQuoteAsReceived(quote.id);
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (quote.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (activeFilter === "draft") {
      matchesFilter = quote.status === "draft";
    } else if (activeFilter === "sent") {
      matchesFilter = quote.status === "sent";
    } else if (activeFilter === "receiving") {
      matchesFilter = quote.status === "receiving";
    } else if (activeFilter === "under_review") {
      matchesFilter = quote.status === "under_review";
    } else if (activeFilter === "approved") {
      matchesFilter = quote.status === "approved";
    } else if (activeFilter === "rejected") {
      matchesFilter = quote.status === "rejected";
    }
    
    return matchesSearch && matchesFilter;
  });

  // Calculate metrics - Based on all quotes
  const totalActive = quotes.length;
  const draftQuotes = quotes.filter(q => q.status === 'draft').length;
  const sentQuotes = quotes.filter(q => q.status === 'sent').length;
  const receivingQuotes = quotes.filter(q => q.status === 'receiving').length;
  const underReviewQuotes = quotes.filter(q => q.status === 'under_review').length;
  const approvedQuotes = quotes.filter(q => q.status === 'approved').length;

  // Additional metrics
  const totalRFQs = quotes.length;
  const inProgress = sentQuotes + receivingQuotes + underReviewQuotes;
  const dueSoon = quotes.filter(q => {
    if (!q.deadline) return false;
    const deadline = new Date(q.deadline);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 2 && diffDays >= 0;
  }).length;
  const responseRate = totalActive > 0 ? Math.round((approvedQuotes / totalActive) * 100) : 0;

  // Cálculos de paginação
  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentQuotes = filteredQuotes.slice(startIndex, endIndex);

  // Reset da página quando filtros mudam
  const resetPage = () => {
    setCurrentPage(1);
  };

  // Resetar página quando filtros mudam
  useEffect(() => {
    resetPage();
  }, [searchTerm, activeFilter]);

  const statusOptions = [
    { value: "all", label: "Todas" },
    { value: "draft", label: "Rascunho" },
    { value: "sent", label: "Enviadas" },
    { value: "under_review", label: "Em Análise" },
    { value: "approved", label: "Aprovadas" },
    { value: "rejected", label: "Reprovadas" },
  ];

  return (
    <div className="space-y-6">
      {/* Session Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-semibold">Problema de Autenticação</h3>
          </div>
          <p className="text-sm text-destructive/80 mt-1">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => refetch()}
          >
            Tentar Novamente
          </Button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cotações</h1>
          <p className="text-muted-foreground">
            Gerencie todas as cotações e solicitações de orçamento
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setIsMatrixManagerOpen(true)}
          >
            <Archive className="h-4 w-4" />
            Matrizes de Decisão
          </Button>
          <Button 
            className="btn-corporate flex items-center gap-2"
            onClick={() => {
              const canCreate = enforceLimit('CREATE_QUOTE');
              if (canCreate) {
                setIsCreateModalOpen(true);
              }
            }}
            disabled={!!error} // Disable if there's an auth error
          >
            <Plus className="h-4 w-4" />
            Nova Cotação
          </Button>
        </div>
      </div>

      {/* Filter Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <FilterMetricCard
          title="Todas Ativas"
          value={totalActive}
          icon={<FileText />}
          isActive={activeFilter === "all"}
          onClick={() => setActiveFilter("all")}
          variant="default"
        />
        <FilterMetricCard
          title="Rascunhos"
          value={draftQuotes}
          icon={<Edit />}
          isActive={activeFilter === "draft"}
          onClick={() => setActiveFilter("draft")}
          variant="secondary"
        />
        <FilterMetricCard
          title="Enviadas"
          value={sentQuotes}
          icon={<Eye />}
          isActive={activeFilter === "sent"}
          onClick={() => setActiveFilter("sent")}
          variant="warning"
        />
        <FilterMetricCard
          title="Aprovadas"
          value={approvedQuotes}
          icon={<Plus />}
          isActive={activeFilter === "approved"}
          onClick={() => setActiveFilter("approved")}
          variant="success"
        />
        <FilterMetricCard
          title="Em Análise"
          value={underReviewQuotes}
          icon={<Archive />}
          isActive={activeFilter === "under_review"}
          onClick={() => setActiveFilter("under_review")}
          variant="default"
        />
      </div>

      {/* Additional Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalRFQs}</p>
              <p className="text-sm text-muted-foreground">Total de RFQs</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Eye className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgress}</p>
              <p className="text-sm text-muted-foreground">Em Andamento</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Filter className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dueSoon}</p>
              <p className="text-sm text-muted-foreground">Vencendo Hoje</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Plus className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{responseRate}%</p>
              <p className="text-sm text-muted-foreground">Taxa de Resposta</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="card-corporate">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por RFQ, título ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleForceRefresh} className="text-xs">
                🔄 Refresh
              </Button>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card className="card-corporate">
        <CardHeader>
          <CardTitle>
            Lista de Cotações ({filteredQuotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="table-corporate">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Status</th>
                  <th>Itens</th>
                  <th>Respostas</th>
                  <th>Prazo</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {currentQuotes.map((quote) => (
                  <tr key={quote.id}>
                    <td>
                      <div>
                        <p className="font-medium">{quote.title}</p>
                        <p className="text-sm text-muted-foreground font-mono">ID: {quote.id}</p>
                      </div>
                    </td>
                    <td>
                      <StatusProgressIndicator status={quote.status} />
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{quote.items_count || 0} item(s)</span>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">
                        {quote.responses_count || 0}/{quote.suppliers_sent_count || 0}
                        <p className="text-xs text-muted-foreground">respostas</p>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">
                        {quote.deadline ? (
                          <>
                            <p>{new Date(quote.deadline).toLocaleDateString('pt-BR')}</p>
                            <p className="text-xs text-orange-600">
                              {Math.ceil((new Date(quote.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias restantes
                            </p>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Sem prazo</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <p className="text-sm">
                        {new Date(quote.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleViewClick(quote)}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEditClick(quote)}
                          title="Editar"
                           disabled={quote.status === 'approved'}
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                          {/* Send to Suppliers button - only for draft and sent quotes */}
                          {(quote.status === 'draft' || quote.status === 'sent') && (
                            <SendQuoteToSuppliersModal
                              quote={quote}
                              trigger={
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700"
                                  title="Enviar para Fornecedores"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              }
                            />
                          )}
                          
                          {/* Comparator button - only show for quotes with proposals */}
                           {(quote.status === 'sent' || quote.status === 'receiving' || quote.status === 'received' || quote.status === 'under_review') && (quote.responses_count || 0) >= 1 && (
                           <QuoteComparisonButton
                             quoteId={quote.id}
                             quoteTitle={quote.title}
                             responsesCount={quote.responses_count || 0}
                             disabled={false}
                           />
                          )}
                         
                          {/* Mark as Received button - only for quotes with status 'received' but not yet approved */}
                          {quote.status === 'received' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-green-600 hover:text-green-700"
                              title="Marcar como Recebido"
                              onClick={() => handleMarkAsReceived(quote)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title={quote.status === 'draft' ? 'Excluir' : 'Cancelar'}
                          onClick={() => handleDeleteClick(quote)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredQuotes.length)} de {filteredQuotes.length} cotações
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
        </CardContent>
      </Card>

      {/* Create/Edit Quote Modal */}
      <CreateQuoteModalSupabase
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) {
            setEditingQuote(null);
          }
        }}
        onQuoteCreate={editingQuote ? handleQuoteUpdate : handleQuoteCreate}
        editingQuote={editingQuote}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        quote={quoteToDelete}
        onConfirm={handleDeleteConfirm}
      />

      {/* Quote Detail Modal */}
      <QuoteDetailModal
        open={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setViewingQuote(null);
        }}
        quote={viewingQuote}
        onStatusChange={(quoteId, newStatus) => {
          updateQuote(quoteId, { status: newStatus });
        }}
      />

      {/* Decision Matrix Manager */}
      <DecisionMatrixManager
        open={isMatrixManagerOpen}
        onClose={() => setIsMatrixManagerOpen(false)}
      />

      {/* Empty State */}
      {filteredQuotes.length === 0 && (
        <Card className="card-corporate">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma cotação encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all" 
                ? "Tente ajustar os filtros de busca"
                : "Comece criando sua primeira cotação"
              }
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Button 
                className="btn-corporate"
                onClick={() => {
                  const canCreate = enforceLimit('CREATE_QUOTE');
                  if (canCreate) {
                    setIsCreateModalOpen(true);
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Cotação
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}