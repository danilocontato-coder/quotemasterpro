import { useState, useEffect, lazy, Suspense } from "react";
import { Plus, Search, Filter, Eye, Trash2, FileText, Edit, Archive, ChevronLeft, ChevronRight, Send, CheckCircle, AlertCircle, Sparkles, Clock, BarChart3, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterMetricCard } from "@/components/ui/filter-metric-card";
import { OptimizedSkeleton } from "@/components/ui/optimized-components";
import { InitialLoader } from "@/components/layout/InitialLoader";
import { PageLoader } from "@/components/ui/page-loader";

import { useSupabaseQuotes } from "@/hooks/useSupabaseQuotes";
import { useSupabaseSubscriptionGuard } from "@/hooks/useSupabaseSubscriptionGuard";
import { useAIQuoteFeature } from "@/hooks/useAIQuoteFeature";
import { getStatusColor, getStatusText } from "@/utils/statusUtils";
import { formatLocalDateTime, formatLocalDate } from "@/utils/dateUtils";
import { AnimatedHeader, AnimatedGrid, AnimatedSection } from '@/components/ui/animated-page';
import { toast } from "sonner";

// Lazy load modais pesados
const CreateQuoteModalSupabase = lazy(() => import("@/components/quotes/CreateQuoteModalSupabase").then(m => ({ default: m.CreateQuoteModalSupabase })));
const DeleteConfirmationModal = lazy(() => import("@/components/quotes/DeleteConfirmationModal").then(m => ({ default: m.DeleteConfirmationModal })));
const QuoteComparisonButton = lazy(() => import("@/components/quotes/QuoteComparisonButton").then(m => ({ default: m.QuoteComparisonButton })));
const DecisionMatrixManager = lazy(() => import("@/components/quotes/DecisionMatrixManager").then(m => ({ default: m.DecisionMatrixManager })));
const QuoteDetailModal = lazy(() => import("@/components/quotes/QuoteDetailModal").then(m => ({ default: m.QuoteDetailModal })));
const StatusProgressIndicator = lazy(() => import("@/components/quotes/StatusProgressIndicator").then(m => ({ default: m.StatusProgressIndicator })));
const SendQuoteToSuppliersModal = lazy(() => import("@/components/quotes/SendQuoteToSuppliersModal").then(m => ({ default: m.SendQuoteToSuppliersModal })));
const DocumentUploadModal = lazy(() => import("@/components/quotes/DocumentUploadModal").then(m => ({ default: m.DocumentUploadModal })));
const AIQuoteChat = lazy(() => import("@/components/quotes/AIQuoteChat").then(m => ({ default: m.AIQuoteChat })));

export default function Quotes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [visitFilter, setVisitFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMatrixManagerOpen, setIsMatrixManagerOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<any | null>(null);
  const [viewingQuote, setViewingQuote] = useState<any | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<any | null>(null);
  const [isInitialRender, setIsInitialRender] = useState(true);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  
  const { quotes, createQuote, updateQuote, deleteQuote, isLoading, error, markQuoteAsReceived, refetch } = useSupabaseQuotes();
  const { enforceLimit } = useSupabaseSubscriptionGuard();
  const { isEnabled: aiFeatureEnabled, isLoading: aiFeatureLoading } = useAIQuoteFeature();

  console.log('🤖 [QUOTES-PAGE] AI Feature Status:', { 
    aiFeatureEnabled, 
    aiFeatureLoading,
    hookRan: true 
  });

  // Carregar alerts apenas quando necessário
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  
  useEffect(() => {
    // Habilitar alerts após carregamento inicial
    const timer = setTimeout(() => {
      setAlertsEnabled(true);
      setIsInitialRender(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

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

  const handleForceRefresh = () => {
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
        console.log('🗑️ [QUOTES-PAGE] Starting delete process for quote:', quoteToDelete.id);
        
        await deleteQuote(quoteToDelete.id);
        await refetch();
        
        const action = quoteToDelete.status === 'draft' ? 'excluída' : 'cancelada';
        toast.success(`Cotação ${action} com sucesso!`);
        setQuoteToDelete(null);
        setIsDeleteModalOpen(false);
        
        console.log('✅ [QUOTES-PAGE] Delete process completed successfully');
      } catch (error) {
        console.error('❌ [QUOTES-PAGE] Error in delete process:', error);
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

  const handleAIQuoteGenerated = (aiQuote: any) => {
    // Pré-preencher modal de criação com dados da IA (apenas para casos onde RFQ não foi criada no banco)
    setEditingQuote({
      title: aiQuote.title,
      description: aiQuote.description,
      items: aiQuote.items || [],
      ai_generated: true,
      ai_considerations: aiQuote.considerations || []
    });
    setIsCreateModalOpen(true);
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
    
    let matchesVisitFilter = true;
    if (visitFilter === "requires_visit") {
      matchesVisitFilter = quote.requires_visit === true;
    } else if (visitFilter === "awaiting_visit") {
      matchesVisitFilter = quote.status === "awaiting_visit";
    } else if (visitFilter === "visit_scheduled") {
      matchesVisitFilter = quote.status === "visit_scheduled";
    } else if (visitFilter === "visit_confirmed") {
      matchesVisitFilter = quote.status === "visit_confirmed";
    } else if (visitFilter === "visit_overdue") {
      matchesVisitFilter = quote.status === "visit_overdue";
    }
    
    return matchesSearch && matchesFilter && matchesVisitFilter;
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

  if (isLoading) {
    return (
      <PageLoader
        hasHeader={true}
        hasMetrics={true}
        metricsCount={6}
        hasSearch={true}
        hasGrid={true}
        gridColumns={3}
      />
    );
  }

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
      <div className="flex flex-col gap-4 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Cotações
          </h1>
          <p className="text-sm md:text-base text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Gerencie todas as cotações e solicitações de orçamento
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 animate-fade-in w-full" style={{ animationDelay: '0.3s' }}>
          <Button 
            variant="outline"
            className="flex items-center gap-2 w-full sm:w-auto justify-center"
            onClick={() => setIsMatrixManagerOpen(true)}
          >
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">Matrizes de Decisão</span>
            <span className="sm:hidden">Matrizes</span>
          </Button>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                const canCreate = enforceLimit('CREATE_QUOTE');
                if (canCreate) {
                  setIsDocumentModalOpen(true);
                }
              }} 
              className="flex items-center gap-2 justify-center"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Cotação por PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button 
              variant="default" 
              onClick={() => {
                const canCreate = enforceLimit('CREATE_QUOTE');
                if (canCreate) {
                  setIsAIChatOpen(true);
                }
              }} 
              className="flex items-center gap-2 justify-center"
              disabled={!!error}
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Cotação por IA</span>
              <span className="sm:hidden">IA</span>
            </Button>
          </div>
          <Button 
            className="btn-corporate flex items-center gap-2 w-full sm:w-auto justify-center sm:ml-auto"
            onClick={() => {
              const canCreate = enforceLimit('CREATE_QUOTE');
              if (canCreate) {
                setIsCreateModalOpen(true);
              }
            }}
            disabled={!!error}
          >
            <Plus className="h-4 w-4" />
            Nova Cotação
          </Button>
        </div>
      </div>

      {/* Filter Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
        <div className="animate-scale-in" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
          <FilterMetricCard
            title="Todas Ativas"
            value={totalActive}
            icon={<FileText />}
            isActive={activeFilter === "all"}
            onClick={() => { setActiveFilter("all"); setVisitFilter("all"); }}
            variant="default"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.15s', opacity: 0, animationFillMode: 'forwards' }}>
          <FilterMetricCard
            title="Rascunhos"
            value={draftQuotes}
            icon={<Edit />}
            isActive={activeFilter === "draft"}
            onClick={() => { setActiveFilter("draft"); setVisitFilter("all"); }}
            variant="secondary"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
          <FilterMetricCard
            title="Enviadas"
            value={sentQuotes}
            icon={<Eye />}
            isActive={activeFilter === "sent"}
            onClick={() => { setActiveFilter("sent"); setVisitFilter("all"); }}
            variant="warning"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.25s', opacity: 0, animationFillMode: 'forwards' }}>
          <FilterMetricCard
            title="Aprovadas"
            value={approvedQuotes}
            icon={<Plus />}
            isActive={activeFilter === "approved"}
            onClick={() => { setActiveFilter("approved"); setVisitFilter("all"); }}
            variant="success"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
          <FilterMetricCard
            title="Em Análise"
            value={underReviewQuotes}
            icon={<Archive />}
            isActive={activeFilter === "under_review"}
            onClick={() => { setActiveFilter("under_review"); setVisitFilter("all"); }}
            variant="default"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.35s', opacity: 0, animationFillMode: 'forwards' }}>
          <FilterMetricCard
            title="Com Visita"
            value={quotes.filter(q => q.requires_visit).length}
            icon={<Calendar />}
            isActive={visitFilter === "requires_visit"}
            onClick={() => { setActiveFilter("all"); setVisitFilter("requires_visit"); }}
            variant="warning"
          />
        </div>
      </div>

      {/* Additional Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
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
      <Card className="card-corporate animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar cotações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={handleForceRefresh} className="text-xs flex-1 sm:flex-none">
                🔄 <span className="ml-1 hidden sm:inline">Refresh</span>
              </Button>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm flex-1 sm:flex-none"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="icon" className="flex-shrink-0">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentQuotes.map((quote, index) => {
          const animationDelay = 0.5 + (index * 0.05);
          return (
            <Card 
              key={quote.id} 
              className="card-corporate hover:shadow-lg transition-all hover-scale animate-fade-in flex flex-col" 
              style={{ 
                animationDelay: `${animationDelay}s`,
                opacity: 0,
                animationFillMode: 'forwards'
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base leading-tight line-clamp-2 mb-2">
                      {quote.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-mono">
                      {quote.id}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusProgressIndicator status={quote.status} />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 flex-1">
                {/* Quote Info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Itens
                    </span>
                    <span className="font-semibold text-sm">{quote.items_count || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Respostas
                    </span>
                    <span className="font-semibold text-sm">
                      {quote.responses_count || 0}/{quote.suppliers_sent_count || 0}
                    </span>
                  </div>
                  
                  {quote.deadline && (
                    <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950 rounded-md border border-orange-200 dark:border-orange-800">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Prazo
                      </span>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatLocalDate(quote.deadline)}</p>
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          {Math.ceil((new Date(quote.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-border mt-auto">
                  {/* Compare Button - Featured when multiple responses */}
                  {quote.responses_count >= 2 && (
                    <div className="mb-2">
                      <Suspense fallback={<Button variant="outline" size="sm" className="w-full" disabled><BarChart3 className="h-4 w-4 mr-2" />Comparar</Button>}>
                        <QuoteComparisonButton
                          quoteId={quote.id}
                          quoteTitle={quote.title}
                          responsesCount={quote.responses_count}
                        />
                      </Suspense>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Button 
                      variant="default" 
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewClick(quote)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditClick(quote)}
                      disabled={quote.status === 'approved'}
                      title={quote.status === 'approved' ? 'Não é possível editar cotações aprovadas' : 'Editar cotação'}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {(quote.status === 'draft' || quote.status === 'sent') && (
                      <Suspense fallback={<Button variant="secondary" size="sm" className="flex-1" disabled><Send className="h-4 w-4 mr-2" />Enviar</Button>}>
                        <SendQuoteToSuppliersModal
                          quote={quote}
                          trigger={
                            <Button variant="secondary" size="sm" className="flex-1">
                              <Send className="h-4 w-4 mr-2" />
                              Enviar
                            </Button>
                          }
                        />
                      </Suspense>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteClick(quote)}
                      title={quote.status === 'draft' ? 'Excluir cotação' : 'Cancelar cotação'}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Criado em {formatLocalDate(quote.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            Mostrando {startIndex + 1} a {Math.min(endIndex, filteredQuotes.length)} de {filteredQuotes.length} cotações
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Anterior</span>
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-8"
            >
              <span className="hidden sm:inline mr-1">Próxima</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Quote Modal */}
      <Suspense fallback={null}>
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
      </Suspense>

      {/* Delete Confirmation Modal */}
      <Suspense fallback={null}>
        <DeleteConfirmationModal
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
          quote={quoteToDelete}
          onConfirm={handleDeleteConfirm}
        />
      </Suspense>

      {/* Quote Detail Modal */}
      <Suspense fallback={null}>
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
      </Suspense>

      {/* Decision Matrix Manager */}
      <Suspense fallback={null}>
        <DecisionMatrixManager
          open={isMatrixManagerOpen}
          onClose={() => setIsMatrixManagerOpen(false)}
        />
      </Suspense>

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

      {/* AI Quote Chat Modal */}
      {isAIChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Suspense fallback={<div>Carregando chat...</div>}>
            <AIQuoteChat
              onQuoteGenerated={(quote) => {
                handleAIQuoteGenerated(quote);
                setIsAIChatOpen(false);
              }}
              onClose={() => setIsAIChatOpen(false)}
              onRefresh={refetch}
            />
          </Suspense>
        </div>
      )}

      {/* Document Upload Modal */}
      <Suspense fallback={null}>
        <DocumentUploadModal
          open={isDocumentModalOpen}
          onOpenChange={setIsDocumentModalOpen}
          onQuoteGenerated={(quote) => {
            handleAIQuoteGenerated(quote);
          }}
        />
      </Suspense>

      {/* Economy Notification - Removed for now */}
    </div>
  );
}