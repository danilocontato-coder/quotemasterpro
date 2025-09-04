import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  DollarSign, 
  Clock, 
  CheckCircle,
  TrendingUp,
  Package,
  MessageSquare,
  Eye
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSupabaseSupplierDashboard } from "@/hooks/useSupabaseSupplierDashboard";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  color?: string;
}

function MetricCard({ title, value, icon: Icon, trend, color = "text-primary" }: MetricCardProps) {
  return (
    <Card className="card-corporate hover:shadow-[var(--shadow-dropdown)] transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {trend && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {trend}
              </p>
            )}
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SupplierDashboard() {
  const { metrics, recentQuotes, isLoading } = useSupabaseSupplierDashboard();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Aguardando Proposta</Badge>;
      case 'proposal_sent':
        return <Badge variant="default">Proposta Enviada</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Aprovado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard do Fornecedor</h1>
        <p className="text-muted-foreground">
          Acompanhe suas cotações, propostas e desempenho
        </p>
      </div>

      {/* Metrics Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Cotações Ativas"
            value={metrics.activeQuotes}
            icon={FileText}
            trend={`${metrics.activeQuotes > 0 ? '+' : ''}${metrics.activeQuotes} ativas`}
          />
          <MetricCard
            title="Propostas Pendentes"
            value={metrics.pendingProposals}
            icon={Clock}
            color="text-orange-600"
            trend={`${metrics.pendingProposals} aguardando`}
          />
          <MetricCard
            title="Vendas no Mês"
            value={`R$ ${metrics.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="text-green-600"
            trend={`${metrics.revenueGrowth > 0 ? '+' : ''}${metrics.revenueGrowth.toFixed(1)}% vs mês anterior`}
          />
          <MetricCard
            title="Taxa de Aprovação"
            value={`${metrics.approvalRate.toFixed(0)}%`}
            icon={CheckCircle}
            color="text-blue-600"
            trend={`${metrics.approvalGrowth > 0 ? '+' : ''}${metrics.approvalGrowth.toFixed(1)}% vs anterior`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Quotes */}
        <div className="lg:col-span-2">
          <Card className="card-corporate">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Cotações Recentes</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/supplier/quotes">Ver Todas</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : recentQuotes.length > 0 ? (
                <div className="space-y-4">
                  {recentQuotes.map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-foreground">{quote.title}</h4>
                        {getStatusBadge(quote.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{quote.client}</span>
                        <span>•</span>
                        <span>Prazo: {new Date(quote.deadline).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <span className="font-medium text-green-600">
                          R$ {quote.estimatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/supplier/quotes/${quote.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma cotação recente encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card className="card-corporate">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/supplier/quotes">
                  <FileText className="mr-2 h-4 w-4" />
                  Ver Cotações
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/supplier/products">
                  <Package className="mr-2 h-4 w-4" />
                  Gerenciar Produtos
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/supplier/deliveries">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Registrar Entrega
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/supplier/messages">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Mensagens
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}