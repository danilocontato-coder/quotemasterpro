import { FileText, Users, CheckCircle, DollarSign, Clock, TrendingUp, AlertTriangle, TestTube2 } from "lucide-react";
import { Link } from 'react-router-dom';
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { QuoteLimitsMetric } from "@/components/dashboard/QuoteLimitsMetric";
import { RatingPrompts } from "@/components/ratings/RatingPrompts";
import { UsageLimitsCard } from "@/components/limits/UsageLimitsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisualCard } from "@/components/ui/visual-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useSupabaseDashboard } from "@/hooks/useSupabaseDashboard";
import { useSupabaseCurrentClient } from "@/hooks/useSupabaseCurrentClient";
import { useSupabasePlanDetails } from '@/hooks/useSupabaseSubscriptionPlans';
import { AdminModeIndicator } from '@/components/admin/AdminModeIndicator';
import heroDashboard from "@/assets/hero-dashboard.jpg";

export default function Dashboard() {
  const { clientName, subscriptionPlan, isLoading: clientLoading } = useSupabaseCurrentClient();
  const { displayName: planDisplayName } = useSupabasePlanDetails(subscriptionPlan);
  const { metrics, activities, isLoading, error, refetch } = useSupabaseDashboard();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'pending':
      case 'under_review':
        return 'text-yellow-600 bg-yellow-50';
      case 'rejected':
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'sent': return 'Enviada';
      case 'under_review': return 'Em Análise';
      case 'approved': return 'Aprovada';
      case 'rejected': return 'Reprovada';
      case 'completed': return 'Concluída';
      case 'cancelled': return 'Cancelada';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        {/* Admin Mode Indicator */}
        <AdminModeIndicator />
        
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de cotações e orçamentos
          </p>
        </div>
        
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Erro ao carregar dados</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refetch}
                  className="mt-3"
                >
                  Tentar novamente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Mode Indicator */}
      <AdminModeIndicator />
      
      {/* System Tests Quick Access */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <TestTube2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">🧪 Testes Automatizados</h3>
                <p className="text-sm text-muted-foreground">
                  Validação completa de segurança, isolamento de dados e performance
                </p>
              </div>
            </div>
            <Link to="/system-tests">
              <Button size="lg" className="gap-2">
                <TestTube2 className="h-4 w-4" />
                Executar Testes
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema de cotações e orçamentos
        </p>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <MetricCard
              title="Total de Cotações"
              value={metrics.totalQuotes}
              change={metrics.totalQuotes > 0 ? "+12% vs mês anterior" : "Nenhuma cotação ainda"}
              changeType={metrics.totalQuotes > 0 ? "positive" : "neutral"}
              icon={FileText}
              description="Todas as cotações no sistema"
            />
            
            <MetricCard
              title="Aprovações Pendentes"
              value={metrics.pendingApprovals}
              change={metrics.pendingApprovals > 0 ? "Aguardando análise" : "Nada pendente"}
              changeType={metrics.pendingApprovals > 0 ? "neutral" : "positive"}
              icon={CheckCircle}
              description="Aguardando aprovação"
            />
            
            <MetricCard
              title="Fornecedores Ativos"
              value={metrics.activeSuppliers}
              change={metrics.activeSuppliers > 0 ? "+3 este mês" : "Cadastre fornecedores"}
              changeType={metrics.activeSuppliers > 0 ? "positive" : "neutral"}
              icon={Users}
              description="Fornecedores cadastrados"
            />
          </>
        )}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <MetricCard
              title="Gasto Mensal"
              value={`R$ ${metrics.monthlySpending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              change={metrics.monthlySpending > 0 ? "-8% vs mês anterior" : "Nenhum gasto ainda"}
              changeType={metrics.monthlySpending > 0 ? "positive" : "neutral"}
              icon={DollarSign}
              description="Total gasto este mês"
            />
            
            <MetricCard
              title="Concluídas"
              value={metrics.completedThisMonth}
              change={metrics.completedThisMonth > 0 ? "Meta: 40" : "Nenhuma concluída"}
              changeType="neutral"
              icon={TrendingUp}
              description="Cotações finalizadas"
            />
            
            <MetricCard
              title="Tempo Médio"
              value={metrics.avgResponseTime}
              change={metrics.totalQuotes > 0 ? "Melhorou 15%" : "Sem dados"}
              changeType={metrics.totalQuotes > 0 ? "positive" : "neutral"}
              icon={Clock}
              description="Resposta das cotações"
            />

            <MetricCard
              title="Economia Estimada"
              value={`R$ ${metrics.economyEstimated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              change={metrics.economyEstimated > 0 ? "Baseado em propostas aceitas" : "Sem economia calculada"}
              changeType={metrics.economyEstimated > 0 ? "positive" : "neutral"}
              icon={DollarSign}
              description="Economia com cotações"
            />
          </>
        )}
      </div>

      {/* Usage Limits and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <QuickActions />
        </div>
        <div className="space-y-4">
          <QuoteLimitsMetric compact />
          <UsageLimitsCard compact />
        </div>
      </div>

      {/* Rating Prompts */}
      <RatingPrompts />

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="card-corporate">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma atividade recente</p>
                <p className="text-sm text-muted-foreground mt-1">
                  As atividades aparecerão aqui conforme você usar o sistema
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{activity.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.entity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs mt-1 ${
                          activity.status === 'success' ? 'bg-green-100 text-green-700' :
                          activity.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                          activity.status === 'error' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {activity.status === 'success' ? 'Sucesso' :
                         activity.status === 'warning' ? 'Pendente' :
                         activity.status === 'error' ? 'Erro' : 'Info'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
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