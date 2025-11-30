import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  Clock, 
  CheckCircle,
  AlertCircle,
  XCircle,
  Package,
  Calendar,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { useCondominioQuotes, CondominioQuote } from '@/hooks/useCondominioQuotes';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; bgColor: string }> = {
  draft: { label: 'Rascunho', variant: 'secondary', icon: <FileText className="h-3 w-3" />, bgColor: 'bg-gray-100 text-gray-700 border-gray-300' },
  sent: { label: 'Enviada', variant: 'outline', icon: <Clock className="h-3 w-3" />, bgColor: 'bg-blue-50 text-blue-700 border-blue-300' },
  awaiting_approval: { label: 'Aguardando Aprovação', variant: 'outline', icon: <AlertCircle className="h-3 w-3" />, bgColor: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
  pending_approval: { label: 'Pendente Aprovação', variant: 'outline', icon: <AlertCircle className="h-3 w-3" />, bgColor: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
  approved: { label: 'Aprovada', variant: 'default', icon: <CheckCircle className="h-3 w-3" />, bgColor: 'bg-green-50 text-green-700 border-green-300' },
  rejected: { label: 'Rejeitada', variant: 'destructive', icon: <XCircle className="h-3 w-3" />, bgColor: 'bg-red-50 text-red-700 border-red-300' },
  finalized: { label: 'Finalizada', variant: 'secondary', icon: <Package className="h-3 w-3" />, bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  cancelled: { label: 'Cancelada', variant: 'destructive', icon: <XCircle className="h-3 w-3" />, bgColor: 'bg-gray-100 text-gray-600 border-gray-400' },
};

function QuoteStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: 'outline', icon: null, bgColor: 'bg-gray-100' };
  
  return (
    <Badge variant="outline" className={`${config.bgColor} flex items-center gap-1`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

function QuoteCard({ quote, onClick }: { quote: CondominioQuote; onClick: () => void }) {
  return (
    <Card 
      className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-primary/30 hover:border-l-primary"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-semibold text-primary">
                #{quote.local_code}
              </span>
              <QuoteStatusBadge status={quote.status} />
            </div>
            
            <h3 className="font-medium text-foreground truncate mb-1">
              {quote.title}
            </h3>
            
            {quote.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {quote.description}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(quote.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </span>
              
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {quote.items_count} {quote.items_count === 1 ? 'item' : 'itens'}
              </span>
              
              {quote.responses_count > 0 && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {quote.responses_count} {quote.responses_count === 1 ? 'proposta' : 'propostas'}
                </span>
              )}
              
              {quote.supplier_name && (
                <span className="text-primary font-medium">
                  {quote.supplier_name}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <span className="text-lg font-bold text-foreground">
              {formatCurrency(quote.total)}
            </span>
            <Button variant="ghost" size="sm" className="h-8">
              <Eye className="h-4 w-4 mr-1" />
              Ver
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuoteCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-muted">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CotacoesListPage() {
  const navigate = useNavigate();
  const { quotes, isLoading, error, refetch, stats } = useCondominioQuotes();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Filtrar cotações
  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => {
      // Filtro de busca
      const matchesSearch = searchTerm === '' || 
        quote.local_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (quote.description?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filtro de status
      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Cotações
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe todas as cotações do seu condomínio
          </p>
        </div>
        
        <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                <p className="text-xs text-blue-600">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
                <p className="text-xs text-yellow-600">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-green-900">{stats.approved}</p>
                <p className="text-xs text-green-600">Aprovadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Package className="h-8 w-8 text-emerald-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-900">{stats.finalized}</p>
                <p className="text-xs text-emerald-600">Finalizadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, título ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
                <SelectItem value="awaiting_approval">Aguardando Aprovação</SelectItem>
                <SelectItem value="approved">Aprovada</SelectItem>
                <SelectItem value="rejected">Rejeitada</SelectItem>
                <SelectItem value="finalized">Finalizada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quote List */}
      <div className="space-y-3">
        {isLoading ? (
          <>
            <QuoteCardSkeleton />
            <QuoteCardSkeleton />
            <QuoteCardSkeleton />
          </>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
              <h3 className="font-medium text-lg mb-2">Erro ao carregar cotações</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={refetch} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : filteredQuotes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium text-lg mb-2">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Nenhuma cotação encontrada' 
                  : 'Nenhuma cotação ainda'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'As cotações criadas pela administradora aparecerão aqui'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredQuotes.map((quote) => (
            <QuoteCard 
              key={quote.id} 
              quote={quote} 
              onClick={() => navigate(`/condominio/cotacoes/${quote.id}`)}
            />
          ))
        )}
      </div>

      {/* Results count */}
      {!isLoading && !error && filteredQuotes.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Mostrando {filteredQuotes.length} de {quotes.length} cotações
        </p>
      )}
    </div>
  );
}
