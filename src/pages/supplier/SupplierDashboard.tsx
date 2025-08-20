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
  // Mock data - In production this would come from hooks/API
  const recentQuotes = [
    {
      id: 'RFQ009',
      title: 'Manutenção Elétrica',
      client: 'Condomínio Jardim das Flores',
      status: 'pending' as const,
      deadline: '2025-08-28',
      estimatedValue: 3500.00
    },
    {
      id: 'RFQ008',
      title: 'Materiais de Construção',
      client: 'Residencial Vista Alegre',
      status: 'approved' as const,
      deadline: '2025-08-25',
      estimatedValue: 8200.00
    },
    {
      id: 'RFQ007',
      title: 'Equipamentos de Limpeza',
      client: 'Condomínio Jardim das Flores',
      status: 'proposal_sent' as const,
      deadline: '2025-08-30',
      estimatedValue: 1200.00
    }
  ];

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Cotações Ativas"
          value={12}
          icon={FileText}
          trend="+2 esta semana"
        />
        <MetricCard
          title="Propostas Pendentes"
          value={5}
          icon={Clock}
          color="text-orange-600"
          trend="2 vencem hoje"
        />
        <MetricCard
          title="Vendas no Mês"
          value="R$ 45.200"
          icon={DollarSign}
          color="text-green-600"
          trend="+15% vs mês anterior"
        />
        <MetricCard
          title="Taxa de Aprovação"
          value="78%"
          icon={CheckCircle}
          color="text-blue-600"
          trend="+5% vs mês anterior"
        />
      </div>

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