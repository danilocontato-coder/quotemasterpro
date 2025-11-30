import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatQuoteCode } from '@/utils/formatQuoteCode';
import { useNavigate } from 'react-router-dom';

interface QuoteListItem {
  id: string;
  local_code: string | null;
  title: string;
  description: string | null;
  status: string;
  total: number;
  items_count: number;
  created_at: string;
  client_id: string;
  on_behalf_of_client_id: string | null;
}

interface CondominioCotacoesTabProps {
  condominioId: string;
  quotes: QuoteListItem[];
  onRefresh: () => void;
}

export function CondominioCotacoesTab({ condominioId, quotes, onRefresh }: CondominioCotacoesTabProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; variant: any; icon: React.ReactNode; color: string }> = {
      draft: { label: 'Rascunho', variant: 'secondary', icon: <Clock className="h-3 w-3" />, color: 'text-muted-foreground' },
      sent: { label: 'Enviada', variant: 'default', icon: <FileText className="h-3 w-3" />, color: 'text-blue-600' },
      receiving: { label: 'Recebendo', variant: 'default', icon: <Clock className="h-3 w-3" />, color: 'text-blue-600' },
      under_review: { label: 'Em Análise', variant: 'outline', icon: <Clock className="h-3 w-3" />, color: 'text-amber-600' },
      approved: { label: 'Aprovada', variant: 'default', icon: <CheckCircle className="h-3 w-3" />, color: 'text-green-600' },
      rejected: { label: 'Rejeitada', variant: 'destructive', icon: <XCircle className="h-3 w-3" />, color: 'text-red-600' },
      paid: { label: 'Paga', variant: 'default', icon: <DollarSign className="h-3 w-3" />, color: 'text-green-700' },
      cancelled: { label: 'Cancelada', variant: 'secondary', icon: <XCircle className="h-3 w-3" />, color: 'text-muted-foreground' },
      finalized: { label: 'Finalizada', variant: 'default', icon: <CheckCircle className="h-3 w-3" />, color: 'text-green-700' },
    };
    return configs[status] || { label: status, variant: 'secondary', icon: null, color: 'text-muted-foreground' };
  };

  // Filter quotes
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = searchTerm === '' || 
      quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.local_code && quote.local_code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate stats by status
  const statsByStatus = quotes.reduce((acc, quote) => {
    acc[quote.status] = (acc[quote.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Status Overview Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        {[
          { status: 'draft', label: 'Rascunho' },
          { status: 'sent', label: 'Enviada' },
          { status: 'receiving', label: 'Recebendo' },
          { status: 'under_review', label: 'Em Análise' },
          { status: 'approved', label: 'Aprovada' },
          { status: 'paid', label: 'Paga' },
        ].map(({ status, label }) => (
          <Card 
            key={status}
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === status ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{statsByStatus[status] || 0}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Cotações do Condomínio</CardTitle>
              <CardDescription>{filteredQuotes.length} cotações encontradas</CardDescription>
            </div>
            <Button onClick={() => navigate(`/administradora/cotacoes?condominio=${condominioId}`)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Cotação
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
                <SelectItem value="receiving">Recebendo</SelectItem>
                <SelectItem value="under_review">Em Análise</SelectItem>
                <SelectItem value="approved">Aprovada</SelectItem>
                <SelectItem value="rejected">Rejeitada</SelectItem>
                <SelectItem value="paid">Paga</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quotes List */}
          {filteredQuotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">Nenhuma cotação encontrada</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Crie a primeira cotação para este condomínio'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredQuotes.map((quote) => {
                const statusConfig = getStatusConfig(quote.status);
                return (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatQuoteCode(quote)}
                        </span>
                        <span className="font-medium truncate">{quote.title}</span>
                        <Badge variant={statusConfig.variant} className="text-xs gap-1">
                          {statusConfig.icon}
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(quote.created_at), "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                        {' • '}{quote.items_count} itens
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-bold ${statusConfig.color}`}>
                          R$ {Number(quote.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
