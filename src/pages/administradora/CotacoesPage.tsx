import { useState, useMemo } from 'react';
import { useAdministradoraQuotes } from '@/hooks/useAdministradoraQuotes';
import { useAdministradoraQuoteDetail } from '@/hooks/useAdministradoraQuoteDetail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, RefreshCw, Search, Calendar, Users, DollarSign, FileText, Sparkles, Package, Send, Eye, Clock, Brain } from 'lucide-react';
import { formatLocalDateTime, formatLocalDate, formatRelativeTime } from '@/utils/dateUtils';
import { AdministradoraQuoteForm } from '@/components/administradora/AdministradoraQuoteForm';
import { AIQuoteGeneratorModal } from '@/components/administradora/AIQuoteGeneratorModal';
import { AdministradoraQuoteDetailModal } from '@/components/administradora/AdministradoraQuoteDetailModal';
import { FilterMetricCard } from '@/components/ui/filter-metric-card';
import { StatusProgressIndicator } from '@/components/quotes/StatusProgressIndicator';
import { useAuth } from '@/contexts/AuthContext';

export default function CotacoesPage() {
  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  
  const { quotes, isLoading, refetch } = useAdministradoraQuotes();
  const { quote: selectedQuote, isLoading: isLoadingDetail } = useAdministradoraQuoteDetail(selectedQuoteId);
  const { user } = useAuth();

  // Métricas para os cards clicáveis
  const metrics = useMemo(() => {
    return {
      total: quotes.length,
      draft: quotes.filter(q => q.status === 'draft').length,
      sent: quotes.filter(q => q.status === 'sent').length,
      receiving: quotes.filter(q => q.status === 'receiving' || q.status === 'received').length,
      under_review: quotes.filter(q => q.status === 'under_review').length,
      approved: quotes.filter(q => q.status === 'approved').length,
    };
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => {
      const matchesSearch = 
        quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.local_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (quote.on_behalf_of_client_name && quote.on_behalf_of_client_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchTerm, statusFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
  const paginatedQuotes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredQuotes.slice(start, start + itemsPerPage);
  }, [filteredQuotes, currentPage]);

  const handleQuoteClick = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedQuoteId(undefined);
  };

  const handleMetricClick = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cotações</h1>
          <p className="text-muted-foreground">
            Gerencie cotações dos condomínios administrados com análises de IA
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refetch}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          {user && user.clientId && user.name && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowAIModal(true)}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Gerar com IA
              </Button>
              <Button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nova Cotação
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Métricas Clicáveis */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <FilterMetricCard
          title="Todas Ativas"
          value={metrics.total}
          icon={<Package />}
          isActive={statusFilter === 'all'}
          onClick={() => handleMetricClick('all')}
          variant="default"
        />
        <FilterMetricCard
          title="Rascunhos"
          value={metrics.draft}
          icon={<FileText />}
          isActive={statusFilter === 'draft'}
          onClick={() => handleMetricClick('draft')}
          variant="secondary"
        />
        <FilterMetricCard
          title="Enviadas"
          value={metrics.sent}
          icon={<Send />}
          isActive={statusFilter === 'sent'}
          onClick={() => handleMetricClick('sent')}
          variant="default"
        />
        <FilterMetricCard
          title="Recebendo"
          value={metrics.receiving}
          icon={<Clock />}
          isActive={statusFilter === 'receiving'}
          onClick={() => handleMetricClick('receiving')}
          variant="warning"
        />
        <FilterMetricCard
          title="Em Análise"
          value={metrics.under_review}
          icon={<Eye />}
          isActive={statusFilter === 'under_review'}
          onClick={() => handleMetricClick('under_review')}
          variant="secondary"
        />
        <FilterMetricCard
          title="Aprovadas"
          value={metrics.approved}
          icon={<DollarSign />}
          isActive={statusFilter === 'approved'}
          onClick={() => handleMetricClick('approved')}
          variant="success"
        />
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, código, cliente ou condomínio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          {filteredQuotes.length > 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              {filteredQuotes.length} cotaç{filteredQuotes.length === 1 ? 'ão encontrada' : 'ões encontradas'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lista de Cotações com Cards Aprimorados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedQuotes.map((quote) => (
          <Card 
            key={quote.id} 
            className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/50"
            onClick={() => handleQuoteClick(quote.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2 line-clamp-1">{quote.title}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <FileText className="h-4 w-4" />
                    <span>#{quote.local_code}</span>
                  </div>
                  {quote.on_behalf_of_client_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-medium">{quote.on_behalf_of_client_name}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Status com indicador visual */}
              <div className="flex items-center justify-between">
                <StatusProgressIndicator status={quote.status} />
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {quote.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {quote.description}
                </p>
              )}
              
              {/* Métricas da Cotação */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-blue-700">Itens</span>
                  </div>
                  <p className="text-xl font-bold text-blue-900">{quote.items_count}</p>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-700">Propostas</span>
                  </div>
                  <p className="text-xl font-bold text-green-900">{quote.responses_count}</p>
                </div>
              </div>

              {/* Total estimado */}
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Total</span>
                </div>
                <span className="text-lg font-bold text-primary">
                  R$ {quote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Footer com data */}
              <div className="text-xs text-muted-foreground pt-3 border-t flex items-center justify-between">
                <span>Criada {formatRelativeTime(quote.created_at)}</span>
                {quote.responses_count > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Brain className="h-3 w-3 mr-1" />
                    IA disponível
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredQuotes.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-6 mb-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhuma cotação encontrada</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {searchTerm || statusFilter !== 'all'
                ? 'Tente ajustar os filtros de busca para encontrar outras cotações.'
                : 'Comece criando uma nova cotação manualmente ou use nossa IA para gerar uma cotação completa em segundos.'}
            </p>
            {user && user.clientId && user.name && !searchTerm && statusFilter === 'all' && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowAIModal(true)}
                  className="gap-2"
                >
                  <Sparkles className="h-5 w-5" />
                  Gerar com IA
                </Button>
                <Button 
                  size="lg"
                  onClick={() => setShowModal(true)}
                  className="gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Nova Cotação
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {user && user.clientId && user.name && (
        <>
          <AdministradoraQuoteForm
            open={showModal}
            onOpenChange={setShowModal}
            administradoraId={user.clientId}
            administradoraName={user.name}
            onSuccess={() => {
              setShowModal(false);
              refetch();
            }}
          />
          <AIQuoteGeneratorModal
            open={showAIModal}
            onOpenChange={setShowAIModal}
            administradoraId={user.clientId}
            administradoraName={user.name}
            onQuoteGenerated={() => {
              setShowAIModal(false);
              refetch();
            }}
          />
          {showDetailModal && selectedQuote && !isLoadingDetail && (
            <AdministradoraQuoteDetailModal
              open={showDetailModal}
              onClose={handleCloseDetailModal}
              quote={selectedQuote}
              onStatusChange={(quoteId, newStatus) => {
                console.log('Status changed:', quoteId, newStatus);
                refetch();
              }}
              onApprove={(proposal) => {
                console.log('Approved proposal:', proposal);
                refetch();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
