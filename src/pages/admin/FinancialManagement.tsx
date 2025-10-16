import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  FileText,
  Settings,
  CreditCard,
  Calendar,
  MoreHorizontal,
  Play,
  Pause,
  RefreshCw,
  Download,
  Eye,
  Send
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSupabaseFinancial, Subscription, Invoice } from '@/hooks/useSupabaseFinancial';
import { CouponIntegrationPanel } from '@/components/admin/CouponIntegrationPanel';
import { AsaasBillingConfigPanel } from '@/components/admin/AsaasBillingConfigPanel';
import { AsaasPaymentsTable } from '@/components/admin/AsaasPaymentsTable';
import { toast } from 'sonner';

export const FinancialManagement = () => {
  const {
    subscriptions,
    invoices,
    settings,
    metrics,
    isLoading,
    suspendSubscription,
    reactivateSubscription,
    generateInvoice,
    updateSettings,
    loadSubscriptions,
    loadInvoices
  } = useSupabaseFinancial();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showSettings, setShowSettings] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { label: 'Ativo', class: 'bg-green-100 text-green-800 border-green-200' },
      suspended: { label: 'Suspenso', class: 'bg-red-100 text-red-800 border-red-200' },
      cancelled: { label: 'Cancelado', class: 'bg-gray-100 text-gray-800 border-gray-200' },
      past_due: { label: 'Vencido', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      paid: { label: 'Pago', class: 'bg-green-100 text-green-800 border-green-200' },
      open: { label: 'Em Aberto', class: 'bg-blue-100 text-blue-800 border-blue-200' },
      draft: { label: 'Rascunho', class: 'bg-gray-100 text-gray-800 border-gray-200' }
    };

    const config = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    return <Badge className={config.class}>{config.label}</Badge>;
  };

  const handleSubscriptionAction = async (action: string, subscriptionId: string) => {
    switch (action) {
      case 'suspend':
        await suspendSubscription(subscriptionId);
        break;
      case 'reactivate':
        await reactivateSubscription(subscriptionId);
        break;
      case 'invoice':
        await generateInvoice(subscriptionId);
        break;
      default:
        break;
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestão Financeira</h1>
            <p className="text-muted-foreground">
              Controle completo de assinaturas, faturas e cobrança automática
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
            <Button onClick={() => { loadSubscriptions(); loadInvoices(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Receita Total</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(metrics.totalRevenue)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-green-600">+{metrics.growth.toFixed(1)}%</span>
                <span className="text-muted-foreground ml-1">este mês</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Receita Mensal</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(metrics.monthlyRevenue)}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-4 flex items-center text-sm">
                <Users className="h-4 w-4 text-blue-600 mr-1" />
                <span className="text-muted-foreground">
                  {metrics.activeSubscriptions} assinaturas ativas
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Ticket Médio</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {formatCurrency(metrics.averageTicket)}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-orange-600" />
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-muted-foreground">
                  {metrics.totalInvoices} faturas geradas
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Inadimplência</p>
                  <p className="text-2xl font-bold text-red-900">
                    {metrics.pastDueInvoices}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-red-600">{metrics.churnRate.toFixed(1)}%</span>
                <span className="text-muted-foreground ml-1">churn rate</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configurações (quando expandido) */}
        {showSettings && settings && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações Financeiras
              </CardTitle>
              <CardDescription>
                Configure automações, suspensões e integrações de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Cobrança Automática</h4>
                      <p className="text-sm text-muted-foreground">
                        Gerar faturas automaticamente
                      </p>
                    </div>
                    <Switch
                      checked={settings.auto_billing_enabled}
                      onCheckedChange={(checked) => 
                        updateSettings({ auto_billing_enabled: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Suspensão Automática</h4>
                      <p className="text-sm text-muted-foreground">
                        Suspender por inadimplência
                      </p>
                    </div>
                    <Switch
                      checked={settings.auto_suspend_enabled}
                      onCheckedChange={(checked) => 
                        updateSettings({ auto_suspend_enabled: checked })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Dias antes da suspensão</label>
                    <Input
                      type="number"
                      value={settings.days_before_suspension}
                      onChange={(e) => 
                        updateSettings({ days_before_suspension: parseInt(e.target.value) })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Dia do faturamento</label>
                    <Select 
                      value={settings.billing_day?.toString() || '1'} 
                      onValueChange={(value) => updateSettings({ billing_day: parseInt(value) })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione o dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>
                            Dia {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dia do mês para gerar faturas automaticamente
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Taxa de multa (%)</label>
                    <Input
                      type="number"
                      value={settings.late_fee_percentage}
                      onChange={(e) => 
                        updateSettings({ late_fee_percentage: parseFloat(e.target.value) })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Dias para vencimento</label>
                    <Input
                      type="number"
                      value={settings.due_days || 30}
                      onChange={(e) => 
                        updateSettings({ due_days: parseInt(e.target.value) })
                      }
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Quantos dias após a geração a fatura vence
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Ciclo de faturamento padrão</label>
                    <Select 
                      value={settings.default_billing_cycle || 'monthly'} 
                      onValueChange={(value) => updateSettings({ default_billing_cycle: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione o ciclo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                        <SelectItem value="semiannual">Semestral</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Período de carência (dias)</label>
                    <Input
                      type="number"
                      value={settings.days_grace_period}
                      onChange={(e) => 
                        updateSettings({ days_grace_period: parseInt(e.target.value) })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gestão de Cupons (quando configurações expandidas) */}
        {showSettings && (
          <>
            <AsaasBillingConfigPanel />
            <CouponIntegrationPanel />
          </>
        )}

        <Tabs defaultValue="subscriptions" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
              <TabsTrigger value="invoices">Faturas</TabsTrigger>
              <TabsTrigger value="asaas">Cobranças Asaas</TabsTrigger>
              <TabsTrigger value="integrations">Integrações</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                  <SelectItem value="past_due">Vencido</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="open">Em Aberto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle>Assinaturas ({filteredSubscriptions.length})</CardTitle>
                <CardDescription>
                  Gerencie todas as assinaturas ativas e seus status de pagamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ciclo</TableHead>
                      <TableHead>Próximo Venc.</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Carregando assinaturas...
                        </TableCell>
                      </TableRow>
                    ) : filteredSubscriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Nenhuma assinatura encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubscriptions.map((subscription) => (
                        <TableRow key={subscription.id}>
                          <TableCell className="font-mono text-sm">
                            {subscription.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>{subscription.client_id}</TableCell>
                          <TableCell>{subscription.plan_id}</TableCell>
                          <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                          <TableCell className="capitalize">
                            {subscription.billing_cycle === 'monthly' ? 'Mensal' : 'Anual'}
                          </TableCell>
                          <TableCell>{formatDate(subscription.current_period_end)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {subscription.status === 'active' ? (
                                  <DropdownMenuItem 
                                    onClick={() => handleSubscriptionAction('suspend', subscription.id)}
                                  >
                                    <Pause className="h-4 w-4 mr-2" />
                                    Suspender
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    onClick={() => handleSubscriptionAction('reactivate', subscription.id)}
                                  >
                                    <Play className="h-4 w-4 mr-2" />
                                    Reativar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleSubscriptionAction('invoice', subscription.id)}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Gerar Fatura
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Faturas ({filteredInvoices.length})</CardTitle>
                <CardDescription>
                  Visualize e gerencie todas as faturas do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Carregando faturas...
                        </TableCell>
                      </TableRow>
                    ) : filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Nenhuma fatura encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-sm">{invoice.id}</TableCell>
                          <TableCell>{invoice.client_id}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(invoice.amount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell>{formatDate(invoice.due_date)}</TableCell>
                          <TableCell className="capitalize">
                            {invoice.payment_method || 'Não definido'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" />
                                  Baixar PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Send className="h-4 w-4 mr-2" />
                                  Enviar Cobrança
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="asaas">
            <Card>
              <CardHeader>
                <CardTitle>Cobranças do Asaas</CardTitle>
                <CardDescription>
                  Gerencie cobranças diretamente no Asaas: alterar, cancelar e gerar novos boletos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AsaasPaymentsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Integrações de Pagamento
                </CardTitle>
                <CardDescription>
                  Configure Stripe, boletos e outros métodos de pagamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Configurar Integrações</h3>
                  <p className="text-muted-foreground mb-4">
                    Acesse a página de Integrações e APIs para configurar Stripe, boletos e webhooks
                  </p>
                  <Button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: '/admin/integrations' }))}>
                    Ir para Integrações e APIs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FinancialManagement;