import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Zap
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';

export const SuperAdminDashboard = () => {
  const globalMetrics = {
    totalUsers: 2847,
    activeClients: 142,
    activeSuppliers: 89,
    supportTickets: 23,
    monthlyRevenue: 127500.00,
    systemUptime: '99.9%',
    pendingApprovals: 45,
    apiCalls: 1234567
  };

  const recentActivities = [
    { id: 1, type: 'client', action: 'Novo cliente cadastrado', entity: 'Condomínio Ville Real', time: '2 min atrás', status: 'success' },
    { id: 2, type: 'supplier', action: 'Fornecedor aprovado', entity: 'TechFlow Solutions', time: '15 min atrás', status: 'success' },
    { id: 3, type: 'system', action: 'API Stripe configurada', entity: 'Sistema Global', time: '1h atrás', status: 'info' },
    { id: 4, type: 'support', action: 'Ticket crítico aberto', entity: '#TK-2024-001', time: '2h atrás', status: 'warning' },
    { id: 5, type: 'system', action: 'Backup automático concluído', entity: 'Database', time: '3h atrás', status: 'success' }
  ];

  const systemHealth = [
    { service: 'API Gateway', status: 'online', uptime: '99.9%', response: '120ms' },
    { service: 'Database', status: 'online', uptime: '99.8%', response: '45ms' },
    { service: 'Email Service', status: 'online', uptime: '99.7%', response: '200ms' },
    { service: 'WhatsApp API', status: 'warning', uptime: '98.2%', response: '350ms' },
    { service: 'Stripe Integration', status: 'online', uptime: '99.9%', response: '180ms' }
  ];

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
      default: return Activity;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">SuperAdmin Dashboard</h1>
            <p className="text-muted-foreground">Controle total da plataforma QuoteMaster Pro</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <MetricCard
              title="Usuários Totais"
              value={globalMetrics.totalUsers.toLocaleString()}
              icon={Users}
            />
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <MetricCard
              title="Receita Mensal"
              value={`R$ ${globalMetrics.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
            />
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
            <MetricCard
              title="Uptime do Sistema"
              value={globalMetrics.systemUptime}
              icon={Activity}
            />
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <MetricCard
              title="Chamadas API"
              value={globalMetrics.apiCalls.toLocaleString()}
              icon={Zap}
            />
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
              {/* Atividades Recentes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Atividades Recentes
                  </CardTitle>
                  <CardDescription>Últimas ações na plataforma</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          activity.status === 'success' ? 'bg-green-100 text-green-600' :
                          activity.status === 'warning' ? 'bg-yellow-100 text-yellow-600' : 
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {React.createElement(getActivityIcon(activity.type), { className: "h-4 w-4" })}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">{activity.entity}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Status do Sistema */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Status dos Serviços
                  </CardTitle>
                  <CardDescription>Monitoramento em tempo real</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {systemHealth.map((service) => (
                    <div key={service.service} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`}></div>
                        <div>
                          <p className="font-medium text-sm">{service.service}</p>
                          <p className="text-xs text-muted-foreground">Uptime: {service.uptime}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{service.response}</p>
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
                      <span className="text-sm">Ativos</span>
                      <span className="font-semibold">{globalMetrics.activeClients}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Novos (mês)</span>
                      <span className="font-semibold text-green-600">+12</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4">
                      Gerenciar Clientes
                    </Button>
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
                      <span className="font-semibold">{globalMetrics.activeSuppliers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Pendentes</span>
                      <span className="font-semibold text-yellow-600">7</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4">
                      Gerenciar Fornecedores
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-purple-700 flex items-center gap-2">
                    <HeadphonesIcon className="h-5 w-5" />
                    Suporte
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Tickets Abertos</span>
                      <span className="font-semibold">{globalMetrics.supportTickets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Críticos</span>
                      <span className="font-semibold text-red-600">3</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4">
                      Central de Suporte
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="accounts">
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Gerenciamento de Contas</h3>
              <p className="text-muted-foreground mb-4">Interface para gerenciar todas as contas da plataforma</p>
              <Button>Em desenvolvimento</Button>
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