import { FileText, Users, CheckCircle, DollarSign, Clock, TrendingUp, AlertTriangle } from "lucide-react";
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
import { AnimatedPage, AnimatedSection, AnimatedHeader, AnimatedGrid } from '@/components/ui/animated-page';
import heroDashboard from "@/assets/hero-dashboard.jpg";

export default function Dashboard() {
  const { clientName, subscriptionPlan, isLoading: clientLoading } = useSupabaseCurrentClient();
  const { displayName: planDisplayName } = useSupabasePlanDetails(subscriptionPlan);
  const { metrics, activities, isLoading, error, refetch } = useSupabaseDashboard();

  if (isLoading || clientLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

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
    <div className="space-y-8">
      {/* Admin Mode Indicator */}
      <AdminModeIndicator />
      
      {/* Page Header with gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/70 p-8 animate-fade-in shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-white/80 animate-pulse" />
            <span className="text-sm font-medium text-white/90">{clientName || 'Sistema'}</span>
            <span className="text-xs px-2 py-1 bg-white/20 rounded-full text-white/90">{planDisplayName}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Bem-vindo ao QuoteMaster Pro
          </h1>
          <p className="text-base text-white/80 max-w-2xl">
            Gerencie suas cotações e orçamentos com eficiência e inteligência
          </p>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
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
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
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
      </div>

      {/* Usage Limits and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
        {/* Recent Activity */}
        <Card className="card-corporate overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Atividades Recentes
            </CardTitle>
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
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="group relative flex items-center justify-between p-4 bg-gradient-to-r from-secondary/30 to-transparent rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                        {activity.action}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {activity.entity}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="text-xs text-muted-foreground font-medium">{activity.time}</p>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs font-medium shadow-sm ${
                          activity.status === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0' :
                          activity.status === 'warning' ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-0' :
                          activity.status === 'error' ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-0' :
                          'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0'
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