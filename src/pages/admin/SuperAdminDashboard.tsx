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
  RefreshCw
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { useSuperAdminDashboard } from '@/hooks/useSuperAdminDashboard';
import { NotificationTester } from '@/components/debug/NotificationTester';
import { PaginatedActivities } from '@/components/admin/PaginatedActivities';

export const SuperAdminDashboard = () => {
  console.log('SuperAdminDashboard component rendering');
  const navigate = useNavigate();
  const { metrics, activities, systemStatus, financialSummary, isLoading, error } = useSuperAdminDashboard();

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
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">SuperAdmin Dashboard</h1>
            <p className="text-muted-foreground">Controle total da plataforma de cotações</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Sistema Online
            </Badge>
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Logs de Segurança
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Métricas Principais */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <MetricCard
                  title="Usuários Totais"
                  value={isLoading ? "..." : metrics.totalUsers.toLocaleString()}
                  icon={Users}
                />
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <MetricCard
                  title="Receita Mensal"
                  value={isLoading ? "..." : `R$ ${metrics.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  icon={DollarSign}
                />
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                <MetricCard
                  title="Clientes Ativos"
                  value={isLoading ? "..." : metrics.totalClients.toLocaleString()}
                  icon={Building2}
                />
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <MetricCard
                  title="Fornecedores"
                  value={isLoading ? "..." : metrics.totalSuppliers.toLocaleString()}
                  icon={Truck}
                />
              </div>
            </div>
          </div>
          
          {/* Testador de Notificações */}
          <div className="lg:col-span-1">
            <NotificationTester />
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="accounts">Contas</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Atividades Recentes com Paginação */}
              <PaginatedActivities
                activities={activities}
                isLoading={isLoading}
                getActivityIcon={getActivityIcon}
                itemsPerPage={5}
              />

              {/* Status do Sistema */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Status do Sistema
                  </CardTitle>
                  <CardDescription>Monitoramento em tempo real</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-4">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p>Carregando status...</p>
                    </div>
                  ) : systemStatus.map((service) => (
                    <div key={service.service} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`}></div>
                        <div>
                          <p className="font-medium text-sm">{service.service}</p>
                          <p className="text-xs text-muted-foreground">Uptime: {service.uptime}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{service.responseTime}</p>
                        <p className="text-xs text-muted-foreground">Resposta</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Cards de Resumo por Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-blue-700 flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total</span>
                      <span className="font-semibold">{isLoading ? "..." : metrics.totalClients}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Assinaturas Ativas</span>
                      <span className="font-semibold text-green-600">{isLoading ? "..." : metrics.activeSubscriptions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Novos Hoje</span>
                      <span className="font-semibold text-blue-600">{isLoading ? "..." : metrics.todaySignups}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-orange-700 flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Fornecedores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Ativos</span>
                      <span className="font-semibold">{isLoading ? "..." : metrics.totalSuppliers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cotações</span>
                      <span className="font-semibold text-green-600">{isLoading ? "..." : metrics.totalQuotes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Storage (GB)</span>
                      <span className="font-semibold text-orange-600">{isLoading ? "..." : metrics.storageUsed.toFixed(1)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-green-700 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financeiro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Receita Total</span>
                      <span className="font-semibold">R$ {isLoading ? "..." : metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Este Mês</span>
                      <span className="font-semibold text-green-600">R$ {isLoading ? "..." : metrics.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Crescimento</span>
                      <span className="font-semibold text-green-600">+{isLoading ? "..." : financialSummary.growth.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="accounts">
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Gestão de Contas</h3>
              <p className="text-muted-foreground mb-4">Usuários, clientes e fornecedores</p>
              <Button>Acessar Gestão</Button>
            </div>
          </TabsContent>

          <TabsContent value="system">
            <div className="text-center py-12">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Configurações do Sistema</h3>
              <p className="text-muted-foreground mb-4">Configurações avançadas e manutenção</p>
              <Button>Em desenvolvimento</Button>
            </div>
          </TabsContent>

          <TabsContent value="integrations">
            <div className="text-center py-12">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Integrações Externas</h3>
              <p className="text-muted-foreground mb-4">WhatsApp, E-mail, Stripe e outras APIs</p>
              <Button>Em desenvolvimento</Button>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Analytics Avançado</h3>
              <p className="text-muted-foreground mb-4">Relatórios e métricas detalhadas</p>
              <Button>Em desenvolvimento</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;