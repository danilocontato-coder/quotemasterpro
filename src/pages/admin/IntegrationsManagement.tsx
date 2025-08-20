import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  Plus, 
  Zap, 
  Activity, 
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Settings,
  TestTube,
  RefreshCw,
  Mail,
  MessageSquare,
  CreditCard,
  Database,
  BarChart3,
  Globe,
  Key,
  Clock,
  TrendingUp,
  XCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useToast } from '@/hooks/use-toast';

export const IntegrationsManagement = () => {
  const {
    integrations,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    testIntegration,
    stats
  } = useIntegrations();

  const { toast } = useToast();
  const [testingIntegrations, setTestingIntegrations] = useState<Set<string>>(new Set());

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'inactive': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'configuring': return <Settings className="h-4 w-4 text-yellow-500" />;
      default: return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'configuring': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'down': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      case 'payment': return <CreditCard className="h-4 w-4" />;
      case 'storage': return <Database className="h-4 w-4" />;
      case 'analytics': return <BarChart3 className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'whatsapp': return 'bg-green-100 text-green-800 border-green-200';
      case 'payment': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'storage': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'analytics': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleTestIntegration = async (integrationId: string) => {
    setTestingIntegrations(prev => new Set(prev.add(integrationId)));
    
    try {
      const success = await testIntegration(integrationId);
      
      toast({
        title: success ? "Teste bem-sucedido" : "Teste falhou",
        description: success 
          ? "A integração está funcionando corretamente" 
          : "Verifique as configurações da integração",
        variant: success ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        title: "Erro no teste",
        description: "Não foi possível testar a integração",
        variant: "destructive"
      });
    } finally {
      setTestingIntegrations(prev => {
        const newSet = new Set(prev);
        newSet.delete(integrationId);
        return newSet;
      });
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.min((current / limit) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Integrações e APIs</h1>
            <p className="text-muted-foreground">Configure e monitore todas as integrações externas</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Nova Integração
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoramento</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Estatísticas Gerais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Zap className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Integrações</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Ativas</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Activity className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold">{stats.healthy}</p>
                  <p className="text-xs text-muted-foreground">Saudáveis</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
                  <p className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Requisições Hoje</p>
                </CardContent>
              </Card>
            </div>

            {/* Métricas de Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Geral</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Uptime Médio</span>
                    <span className="font-semibold text-green-600">{stats.avgUptime.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.avgUptime} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tempo de Resposta Médio</span>
                    <span className="font-semibold">{Math.round(stats.avgResponseTime)}ms</span>
                  </div>
                  <Progress value={Math.min(stats.avgResponseTime / 10, 100)} className="h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">E-mail</span>
                    </div>
                    <span className="font-semibold">{stats.byType.email}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      <span className="text-sm">WhatsApp</span>
                    </div>
                    <span className="font-semibold">{stats.byType.whatsapp}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Pagamentos</span>
                    </div>
                    <span className="font-semibold">{stats.byType.payment}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">Outros</span>
                    </div>
                    <span className="font-semibold">{stats.byType.other}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Erros Recentes */}
            {stats.recentErrors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Erros Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.recentErrors.map((error) => (
                      <div key={error.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div>
                          <p className="font-medium text-red-800">{error.message}</p>
                          <p className="text-sm text-red-600">
                            {error.action} • {formatTime(error.timestamp)}
                          </p>
                        </div>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            {/* Filtros */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros e Pesquisa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Pesquisar integrações..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="payment">Pagamentos</SelectItem>
                      <SelectItem value="storage">Armazenamento</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                      <SelectItem value="other">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="error">Erro</SelectItem>
                      <SelectItem value="configuring">Configurando</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Integrações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {integrations.map((integration) => (
                <Card key={integration.id} className="relative">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-muted`}>
                          {getTypeIcon(integration.type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {integration.provider}
                          </CardDescription>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border z-50">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Configurar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleTestIntegration(integration.id)}
                            disabled={testingIntegrations.has(integration.id)}
                          >
                            {testingIntegrations.has(integration.id) ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4 mr-2" />
                            )}
                            Testar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Key className="h-4 w-4 mr-2" />
                            Chaves API
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getStatusColor(integration.status)}>
                        {getStatusIcon(integration.status)}
                        <span className="ml-1">
                          {integration.status === 'active' ? 'Ativo' :
                           integration.status === 'inactive' ? 'Inativo' :
                           integration.status === 'error' ? 'Erro' : 'Configurando'}
                        </span>
                      </Badge>
                      
                      <Badge className={getTypeColor(integration.type)}>
                        {integration.type === 'email' ? 'E-mail' :
                         integration.type === 'whatsapp' ? 'WhatsApp' :
                         integration.type === 'payment' ? 'Pagamento' :
                         integration.type === 'storage' ? 'Armazenamento' :
                         integration.type === 'analytics' ? 'Analytics' : 'Outro'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {integration.description}
                    </p>

                    {/* Health Status */}
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span className="text-sm font-medium">Status de Saúde</span>
                      </div>
                      <Badge className={getHealthStatusColor(integration.healthCheck.status)}>
                        {integration.healthCheck.status === 'healthy' ? 'Saudável' :
                         integration.healthCheck.status === 'degraded' ? 'Instável' : 'Inativo'}
                      </Badge>
                    </div>

                    {/* Usage */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uso Diário</span>
                        <span>{integration.limits.currentUsage.toLocaleString()} / {integration.limits.requestsPerDay.toLocaleString()}</span>
                      </div>
                      <Progress 
                        value={getUsagePercentage(integration.limits.currentUsage, integration.limits.requestsPerDay)} 
                        className="h-2" 
                      />
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground">Uptime</p>
                        <p className="font-semibold">{integration.healthCheck.uptime.toFixed(1)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Resposta</p>
                        <p className="font-semibold">{Math.round(integration.healthCheck.avgResponseTime)}ms</p>
                      </div>
                    </div>

                    {/* Last Check */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <Clock className="h-3 w-3" />
                      <span>Última verificação: {formatTime(integration.healthCheck.lastCheck)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Monitoramento em Tempo Real</h3>
              <p className="text-muted-foreground mb-4">Dashboards e alertas de monitoramento</p>
              <Button>Em desenvolvimento</Button>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Integração</CardTitle>
                <CardDescription>Histórico de atividades das integrações</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Integração</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tempo</TableHead>
                      <TableHead>Mensagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integrations.flatMap(integration => 
                      integration.logs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {formatTime(log.timestamp)}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {integration.name}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.action}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={log.status === 'success' ? 'default' : 
                                     log.status === 'error' ? 'destructive' : 'secondary'}
                            >
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.responseTime ? `${log.responseTime}ms` : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.message}
                          </TableCell>
                        </TableRow>
                      ))
                    ).slice(0, 20)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};