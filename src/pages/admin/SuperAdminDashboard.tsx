import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  Truck, 
  HeadphonesIcon, 
  Settings, 
  TrendingUp, 
  DollarSign,
  AlertTriangle,
  Activity,
  Shield,
  Database,
  Zap,
  RefreshCw,
  FileText,
  CreditCard,
  Globe,
  Bot,
  Trash2
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { useSuperAdminDashboard } from '@/hooks/useSuperAdminDashboard';
import { useSuperAdminAnalytics } from '@/hooks/useSuperAdminAnalytics';
import { NotificationTester } from '@/components/debug/NotificationTester';
import { PaginatedActivities } from '@/components/admin/PaginatedActivities';
import { GeographicDistributionMap } from '@/components/admin/charts/GeographicDistributionMap';
import { RevenueChart } from '@/components/admin/charts/RevenueChart';
import { QuotesStatusChart } from '@/components/admin/charts/QuotesStatusChart';
import { TopClientsChart } from '@/components/admin/charts/TopClientsChart';
import { ActivityHeatmap } from '@/components/admin/charts/ActivityHeatmap';
import { ConversionFunnelChart } from '@/components/admin/charts/ConversionFunnelChart';
import { Skeleton } from '@/components/ui/skeleton';
import { TokenMonitoringCard } from '@/components/admin/TokenMonitoringCard';
import { toast } from 'sonner';

export const SuperAdminDashboard = () => {
  console.log('SuperAdminDashboard component rendering');
  const navigate = useNavigate();
  const { metrics, activities, systemStatus, financialSummary, isLoading, error } = useSuperAdminDashboard();
  const { 
    revenueData, 
    quotesStatusData, 
    topClientsData, 
    activityHeatmap,
    conversionFunnel,
    isLoading: analyticsLoading 
  } = useSuperAdminAnalytics();
  
  console.log('SuperAdminDashboard state:', { isLoading, error, metricsCount: Object.keys(metrics).length });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'client': return Building2;
      case 'supplier': return Truck;
      case 'support': return HeadphonesIcon;
      case 'system': return Settings;
      case 'user': return Users;
      case 'quote': return Database;
      case 'payment': return DollarSign;
      default: return Activity;
    }
  };

  const handleClearCache = async () => {
    try {
      // Limpar sessionStorage e localStorage
      sessionStorage.clear();
      localStorage.clear();
      
      // Desregistrar Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      
      // Limpar cache do navegador
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      toast.success('Cache limpo com sucesso!', {
        description: 'A página será recarregada em 2 segundos...'
      });
      
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      console.error('Erro ao limpar cache:', err);
      toast.error('Erro ao limpar cache', {
        description: 'Tente recarregar a página manualmente'
      });
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Erro no Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate(0)} className="mt-4">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary/70 px-6 py-8 border-b">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">SuperAdmin Dashboard</h1>
            <p className="text-white/80">Controle total e insights estratégicos da plataforma</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-white/20 text-white border-white/30 backdrop-blur">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Sistema Online
            </Badge>
            <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/30 hover:bg-white/20" onClick={() => navigate('/admin/audit')}>
              <Shield className="h-4 w-4 mr-2" />
              Auditoria
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 overflow-auto">
        {/* Métricas Principais - KPIs Estratégicos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
          <MetricCard
            title="Usuários Ativos"
            value={isLoading ? "..." : metrics.totalUsers.toLocaleString()}
            change="+12% vs mês anterior"
            changeType="positive"
            icon={Users}
            description="Total de usuários no sistema"
          />
          <MetricCard
            title="Receita Mensal (MRR)"
            value={isLoading ? "..." : `R$ ${(metrics.monthlyRevenue / 1000).toFixed(0)}K`}
            change="+18% vs mês anterior"
            changeType="positive"
            icon={DollarSign}
            description="Receita recorrente mensal"
          />
          <MetricCard
            title="Clientes Ativos"
            value={isLoading ? "..." : metrics.totalClients.toLocaleString()}
            change="+8 novos este mês"
            changeType="positive"
            icon={Building2}
            description="Clientes com assinatura ativa"
          />
          <MetricCard
            title="RFQs Processadas"
            value={isLoading ? "..." : metrics.totalQuotes.toLocaleString()}
            change="+245 esta semana"
            changeType="positive"
            icon={FileText}
            description="Total de cotações no sistema"
          />
        </div>

        {/* Gráficos Principais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {analyticsLoading ? (
            <>
              <Skeleton className="h-96" />
              <Skeleton className="h-96" />
            </>
          ) : (
            <>
              <RevenueChart data={revenueData} />
              <QuotesStatusChart data={quotesStatusData} />
            </>
          )}
        </div>

        {/* Mapa Geográfico + Funil de Conversão */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <GeographicDistributionMap />
          {analyticsLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <ConversionFunnelChart data={conversionFunnel} />
          )}
        </div>

        {/* Top Clientes + Heatmap de Atividade */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          {analyticsLoading ? (
            <>
              <Skeleton className="h-96" />
              <Skeleton className="h-96" />
            </>
          ) : (
            <>
              <TopClientsChart data={topClientsData} />
              <ActivityHeatmap data={activityHeatmap} />
            </>
          )}
        </div>

        {/* Card de Consumo de IA */}
        <Card className="animate-fade-in border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20" style={{ animationDelay: '0.35s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Bot className="h-6 w-6" />
              Consumo de IA - Este Mês
            </CardTitle>
            <CardDescription>
              Monitoramento de uso de tokens e custos de IA por todos os clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Total de Tokens</p>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-xs text-muted-foreground mt-1">Aguardando dados</p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Custo Estimado</p>
                  <p className="text-2xl font-bold text-green-600">-</p>
                  <p className="text-xs text-muted-foreground mt-1">USD</p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Requisições</p>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-xs text-muted-foreground mt-1">Chamadas à API</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full bg-blue-600 text-white hover:bg-blue-700 border-blue-700"
                onClick={() => navigate('/admin/superadmin/ai-usage')}
              >
                Ver Dashboard Completo de IA →
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                💡 Dashboard detalhado com filtros, gráficos e análise por cliente
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card de Monitoramento de Tokens */}
        <div className="animate-fade-in" style={{ animationDelay: '0.37s' }}>
          <TokenMonitoringCard />
        </div>

        {/* Card de Gerenciamento de Cache */}
        <Card className="animate-fade-in border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20" style={{ animationDelay: '0.39s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <Trash2 className="h-6 w-6" />
              Gerenciamento de Cache
            </CardTitle>
            <CardDescription>
              Limpar cache e forçar atualização completa do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-orange-200">
                <p className="text-sm font-semibold mb-2">⚠️ Ação Destrutiva</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Esta ação irá limpar todo o cache do navegador, sessionStorage, localStorage, 
                  e desregistrar Service Workers. Use apenas se houver problemas de cache persistentes.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                  <li>• Limpa sessionStorage e localStorage</li>
                  <li>• Remove todos os Service Workers</li>
                  <li>• Deleta cache do navegador</li>
                  <li>• Recarrega a aplicação automaticamente</li>
                </ul>
              </div>
              <Button 
                variant="destructive" 
                size="lg" 
                className="w-full bg-orange-600 hover:bg-orange-700"
                onClick={handleClearCache}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                🧹 Limpar Todo o Cache e Recarregar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs com Informações Detalhadas */}
        <Tabs defaultValue="overview" className="space-y-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="accounts">Contas</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
            <TabsTrigger value="analytics" className="hidden lg:block">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Atividades Recentes */}
              <PaginatedActivities
                activities={activities}
                isLoading={isLoading}
                getActivityIcon={getActivityIcon}
                itemsPerPage={5}
              />

              {/* Status do Sistema */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Status do Sistema
                  </CardTitle>
                  <CardDescription>Monitoramento em tempo real</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-6">
                  {isLoading ? (
                    <div className="text-center py-4">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                      <p className="text-sm text-muted-foreground">Carregando status...</p>
                    </div>
                  ) : systemStatus.map((service) => (
                    <div key={service.service} className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-all bg-gradient-to-r from-card to-transparent">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)} shadow-lg`}></div>
                        <div>
                          <p className="font-semibold text-sm">{service.service}</p>
                          <p className="text-xs text-muted-foreground">Uptime: {service.uptime}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{service.responseTime}</p>
                        <p className="text-xs text-muted-foreground">Resposta</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Resumo Financeiro Detalhado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-primary/20 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-600" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="font-bold text-lg">{isLoading ? "..." : metrics.totalClients}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm text-muted-foreground">Assinaturas Ativas</span>
                      <span className="font-bold text-lg text-green-600">{isLoading ? "..." : metrics.activeSubscriptions}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm text-muted-foreground">Novos Hoje</span>
                      <span className="font-bold text-lg text-blue-600">{isLoading ? "..." : metrics.todaySignups}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-orange-500 to-red-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-orange-600" />
                    Fornecedores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm text-muted-foreground">Ativos</span>
                      <span className="font-bold text-lg">{isLoading ? "..." : metrics.totalSuppliers}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm text-muted-foreground">Cotações</span>
                      <span className="font-bold text-lg text-green-600">{isLoading ? "..." : metrics.totalQuotes}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm text-muted-foreground">Storage (GB)</span>
                      <span className="font-bold text-lg text-orange-600">{isLoading ? "..." : metrics.storageUsed.toFixed(1)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Financeiro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm text-muted-foreground">Receita Total</span>
                      <span className="font-bold text-lg">R$ {isLoading ? "..." : (metrics.totalRevenue / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm text-muted-foreground">Este Mês</span>
                      <span className="font-bold text-lg text-green-600">R$ {isLoading ? "..." : (metrics.monthlyRevenue / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm text-muted-foreground">Crescimento</span>
                      <span className="font-bold text-lg text-green-600">+{isLoading ? "..." : financialSummary.growth.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="accounts">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/accounts')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Usuários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{metrics.totalUsers}</p>
                  <p className="text-sm text-muted-foreground mt-2">Gerenciar todos os usuários</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/clients')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{metrics.totalClients}</p>
                  <p className="text-sm text-muted-foreground mt-2">Gerenciar clientes e condomínios</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/suppliers')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-orange-600" />
                    Fornecedores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{metrics.totalSuppliers}</p>
                  <p className="text-sm text-muted-foreground mt-2">Gerenciar fornecedores</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="system">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Banco de Dados
                  </CardTitle>
                  <CardDescription>Status e estatísticas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between p-2">
                      <span className="text-sm">Storage Usado</span>
                      <span className="font-semibold">{metrics.storageUsed.toFixed(1)} GB</span>
                    </div>
                    <div className="flex justify-between p-2">
                      <span className="text-sm">Tabelas</span>
                      <span className="font-semibold">28 tabelas</span>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => navigate('/admin/database')}>
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    Segurança
                  </CardTitle>
                  <CardDescription>Logs e monitoramento</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between p-2">
                      <span className="text-sm">Eventos Hoje</span>
                      <span className="font-semibold">{activities.length}</span>
                    </div>
                    <div className="flex justify-between p-2">
                      <span className="text-sm">Alertas Ativos</span>
                      <span className="font-semibold text-yellow-600">0</span>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => navigate('/admin/audit')}>
                      Ver Auditoria
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="integrations">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                    Pagamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Stripe Conectado
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-3">Gateway de pagamento configurado</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    APIs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    Configuração Pendente
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-3">WhatsApp, Email, SMS</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/integrations')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-600" />
                    Configurar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Ver Todas Integrações
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Analytics Avançado
                </CardTitle>
                <CardDescription>Relatórios e métricas detalhadas</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <Activity className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics Completo</h3>
                <p className="text-muted-foreground mb-4">
                  Acesse relatórios detalhados, análises de tendências e insights de negócio
                </p>
                <Button onClick={() => navigate('/admin/analytics')}>
                  Acessar Analytics
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
