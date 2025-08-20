import { FileText, Users, CheckCircle, DollarSign, Clock, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RatingPrompts } from "@/components/ratings/RatingPrompts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisualCard } from "@/components/ui/visual-card";
import { dashboardMetrics, mockQuotes, getStatusColor, getStatusText } from "@/data/mockData";
import heroDashboard from "@/assets/hero-dashboard.jpg";

export default function Dashboard() {
  // Recent quotes for activity feed
  const recentQuotes = mockQuotes.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema de cotações e orçamentos
        </p>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total de Cotações"
          value={dashboardMetrics.totalQuotes}
          change="+12% vs mês anterior"
          changeType="positive"
          icon={FileText}
          description="Todas as cotações no sistema"
        />
        
        <MetricCard
          title="Aprovações Pendentes"
          value={dashboardMetrics.pendingApprovals}
          change="5 vencendo hoje"
          changeType="neutral"
          icon={CheckCircle}
          description="Aguardando aprovação"
        />
        
        <MetricCard
          title="Fornecedores Ativos"
          value={dashboardMetrics.activeSuppliers}
          change="+3 este mês"
          changeType="positive"
          icon={Users}
          description="Fornecedores cadastrados"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Gasto Mensal"
          value={`R$ ${(dashboardMetrics.monthlySpending || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          change="-8% vs mês anterior"
          changeType="positive"
          icon={DollarSign}
          description="Total gasto este mês"
        />
        
        <MetricCard
          title="Concluídas"
          value={dashboardMetrics.completedThisMonth}
          change="Meta: 40"
          changeType="neutral"
          icon={TrendingUp}
          description="Cotações finalizadas"
        />
        
        <MetricCard
          title="Tempo Médio"
          value={dashboardMetrics.avgResponseTime}
          change="Melhorou 15%"
          changeType="positive"
          icon={Clock}
          description="Resposta das cotações"
        />

        <MetricCard
          title="Economia Estimada"
          value="R$ 15.240,00"
          change="Baseado em propostas aceitas"
          changeType="positive"
          icon={DollarSign}
          description="Economia com cotações"
        />
      </div>

          {/* Quick Actions */}
          <QuickActions />

          {/* Rating Prompts */}
          <RatingPrompts />

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <Card className="card-corporate">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Cotações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentQuotes.map((quote) => (
                <div key={quote.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{quote.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {quote.clientName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      R$ {quote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <span className={`${getStatusColor(quote.status)} text-xs`}>
                      {getStatusText(quote.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <VisualCard
          title="Performance Mensal"
          description="Análise de desempenho das cotações"
          image={heroDashboard}
        >
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Gráfico de performance será implementado
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Chart.js ou Recharts integration
            </p>
          </div>
        </VisualCard>
      </div>
    </div>
  );
}