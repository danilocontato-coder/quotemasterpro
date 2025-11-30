import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatQuoteCode } from '@/utils/formatQuoteCode';

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

interface CondominioDashboardTabProps {
  condominio: any;
  metrics: {
    totalQuotes: number;
    activeQuotes: number;
    totalSpent: number;
    activeUsers: number;
  };
  quotes: QuoteListItem[];
}

export function CondominioDashboardTab({ condominio, metrics, quotes }: CondominioDashboardTabProps) {
  // Calculate additional metrics
  const pendingApprovals = quotes.filter(q => q.status === 'under_review').length;
  const approvedThisMonth = quotes.filter(q => {
    const quoteDate = new Date(q.created_at);
    const now = new Date();
    return q.status === 'approved' && 
           quoteDate.getMonth() === now.getMonth() && 
           quoteDate.getFullYear() === now.getFullYear();
  }).length;
  
  const recentQuotes = quotes.slice(0, 5);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; variant: any; icon: React.ReactNode }> = {
      draft: { label: 'Rascunho', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      sent: { label: 'Enviada', variant: 'default', icon: <FileText className="h-3 w-3" /> },
      receiving: { label: 'Recebendo', variant: 'default', icon: <Clock className="h-3 w-3" /> },
      under_review: { label: 'Em Análise', variant: 'outline', icon: <Clock className="h-3 w-3" /> },
      approved: { label: 'Aprovada', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { label: 'Rejeitada', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
      paid: { label: 'Paga', variant: 'default', icon: <DollarSign className="h-3 w-3" /> },
      cancelled: { label: 'Cancelada', variant: 'secondary', icon: <XCircle className="h-3 w-3" /> },
      finalized: { label: 'Finalizada', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
    };
    return configs[status] || { label: status, variant: 'secondary', icon: null };
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Cotações</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalQuotes}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeQuotes} ativas no momento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {metrics.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Em cotações aprovadas/pagas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aprovações Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando decisão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Com acesso ao sistema
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Quotes */}
        <Card>
          <CardHeader>
            <CardTitle>Cotações Recentes</CardTitle>
            <CardDescription>Últimas cotações deste condomínio</CardDescription>
          </CardHeader>
          <CardContent>
            {recentQuotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma cotação ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentQuotes.map((quote) => {
                  const statusConfig = getStatusConfig(quote.status);
                  return (
                    <div
                      key={quote.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{quote.title}</span>
                          <Badge variant={statusConfig.variant} className="text-xs gap-1">
                            {statusConfig.icon}
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatQuoteCode(quote)} • {format(new Date(quote.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          R$ {Number(quote.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">{quote.items_count} itens</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Mês</CardTitle>
            <CardDescription>Performance do mês atual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Aprovadas este mês</span>
              </div>
              <span className="text-lg font-bold text-green-600">{approvedThisMonth}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium">Aguardando aprovação</span>
              </div>
              <span className="text-lg font-bold text-amber-600">{pendingApprovals}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">Cotações ativas</span>
              </div>
              <span className="text-lg font-bold text-blue-600">{metrics.activeQuotes}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Ticket médio</span>
              </div>
              <span className="text-lg font-bold text-primary">
                R$ {metrics.totalQuotes > 0 
                  ? (metrics.totalSpent / metrics.totalQuotes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                  : '0,00'
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
