import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Plus, 
  Crown, 
  Users, 
  TrendingUp,
  DollarSign,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  ToggleLeft,
  ToggleRight,
  Building2,
  Truck,
  Star,
  Zap,
  Shield,
  CheckCircle2,
  Percent
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSupabaseSubscriptionPlans } from '@/hooks/useSupabaseSubscriptionPlans';
import { CreatePlanModalSupabase } from '@/components/admin/CreatePlanModalSupabase';

export const PlansManagement = () => {
  const {
    plans,
    searchTerm,
    setSearchTerm,
    filterAudience,
    setFilterAudience,
    filterStatus,
    setFilterStatus,
    createPlan,
    updatePlan,
    deletePlan,
    duplicatePlan,
    stats,
    isLoading
  } = useSupabaseSubscriptionPlans();

  const [showCreateModal, setShowCreateModal] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateYearlyDiscount = (monthly: number, yearly: number) => {
    if (!monthly || monthly === 0) return 0;
    const yearlyExpected = monthly * 12;
    if (yearly >= yearlyExpected) return 0;
    return Math.round(((yearlyExpected - yearly) / yearlyExpected) * 100);
  };

  const togglePlanStatus = async (planId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updatePlan(planId, { status: newStatus });
    } catch (error) {
      console.error('Erro ao alterar status do plano:', error);
    }
  };

  const handleDuplicate = async (planId: string) => {
    try {
      await duplicatePlan(planId);
    } catch (error) {
      console.error('Erro ao duplicar plano:', error);
    }
  };

  const handleDelete = async (planId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este plano?')) {
      try {
        await deletePlan(planId);
      } catch (error) {
        console.error('Erro ao excluir plano:', error);
      }
    }
  };

  const clientPlans = plans.filter(p => p.target_audience === 'clients' || p.target_audience === 'both');
  const supplierPlans = plans.filter(p => p.target_audience === 'suppliers' || p.target_audience === 'both');

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Planos</h1>
            <p className="text-muted-foreground">Configure planos e limites para clientes e fornecedores</p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="client-plans">Planos Clientes</TabsTrigger>
            <TabsTrigger value="supplier-plans">Planos Fornecedores</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Estatísticas Gerais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Crown className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{stats.totalPlans}</p>
                  <p className="text-xs text-muted-foreground">Total Planos</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold">{stats.totalClients + stats.totalSuppliers}</p>
                  <p className="text-xs text-muted-foreground">Assinantes Totais</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">Receita Total</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold">{stats.avgChurnRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Taxa Churn Média</p>
                </CardContent>
              </Card>
            </div>

            {/* Receita por Público */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Receita por Público</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Building2 className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <p className="text-lg font-bold text-blue-800">
                      {formatCurrency(stats.revenueByAudience.clients)}
                    </p>
                    <p className="text-sm text-blue-600">Clientes</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <Truck className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                    <p className="text-lg font-bold text-orange-800">
                      {formatCurrency(stats.revenueByAudience.suppliers)}
                    </p>
                    <p className="text-sm text-orange-600">Fornecedores</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Users className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                    <p className="text-lg font-bold text-purple-800">
                      {formatCurrency(stats.revenueByAudience.both)}
                    </p>
                    <p className="text-sm text-purple-600">Ambos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Planos Populares */}
            {stats.popularPlans.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Planos Populares
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.popularPlans.map((plan) => (
                      <div key={plan.id} className="border rounded-lg p-4 bg-gradient-to-br from-yellow-50 to-orange-50">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{plan.name}</h3>
                          <Badge variant="default" className="bg-yellow-500">Popular</Badge>
                        </div>
                        <p className="text-2xl font-bold text-primary mb-2">
                          {formatCurrency(plan.pricing.monthly)}/mês
                        </p>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{plan.targetAudience === 'clients' ? 'Cliente' : plan.targetAudience === 'suppliers' ? 'Fornecedor' : 'Ambos'}</span>
                          <span>{(plan.usageStats.clientsSubscribed || 0) + (plan.usageStats.suppliersSubscribed || 0)} usuários</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="client-plans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Planos para Clientes</CardTitle>
                <CardDescription>Gerencie planos de assinatura para clientes (condomínios e empresas)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Pesquisar planos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as 'all' | 'active' | 'inactive')}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {isLoading ? (
                    <div className="col-span-full flex justify-center py-8">
                      <div className="text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Carregando planos...</p>
                      </div>
                    </div>
                  ) : clientPlans.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <Crown className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">
                        Nenhum plano encontrado
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Crie seu primeiro plano para clientes
                      </p>
                    </div>
                  ) : (
                    clientPlans.map((plan) => (
                      <Card key={plan.id} className={`relative ${plan.is_popular ? 'ring-2 ring-primary' : ''}`}>
                        {plan.is_popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-primary text-primary-foreground px-3 py-1">
                              <Star className="h-3 w-3 mr-1" />
                              Popular
                            </Badge>
                          </div>
                        )}
                        
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-blue-100">
                                <Building2 className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{plan.display_name}</CardTitle>
                                <Badge className={getStatusColor(plan.status)}>
                                  {plan.status === 'active' ? 'Ativo' : 'Inativo'}
                                </Badge>
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
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(plan.id)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => togglePlanStatus(plan.id, plan.status)}>
                                  {plan.status === 'active' ? (
                                    <>
                                      <ToggleLeft className="h-4 w-4 mr-2" />
                                      Desativar
                                    </>
                                  ) : (
                                    <>
                                      <ToggleRight className="h-4 w-4 mr-2" />
                                      Ativar
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDelete(plan.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <CardDescription className="text-sm mt-2">
                            {plan.description}
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {/* Preços */}
                          <div className="text-center border-b pb-4">
                            <div className="flex items-baseline justify-center gap-2">
                              <span className="text-3xl font-bold text-primary">
                                {formatCurrency(plan.monthly_price)}
                              </span>
                              <span className="text-muted-foreground">/mês</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 mt-2">
                              <span className="text-sm text-muted-foreground">
                                {formatCurrency(plan.yearly_price)}/ano
                              </span>
                              {calculateYearlyDiscount(plan.monthly_price, plan.yearly_price) > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <Percent className="h-3 w-3 mr-1" />
                                  {calculateYearlyDiscount(plan.monthly_price, plan.yearly_price)}% desconto
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Limites */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Limites:</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span>Cotações/mês:</span>
                                <span className="font-medium">{plan.max_quotes === -1 ? '∞' : plan.max_quotes}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Usuários:</span>
                                <span className="font-medium">{plan.max_users === -1 ? '∞' : plan.max_users}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Fornecedores:</span>
                                <span className="font-medium">{plan.max_suppliers === -1 ? '∞' : plan.max_suppliers}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Armazenamento:</span>
                                <span className="font-medium">{plan.max_storage_gb}GB</span>
                              </div>
                            </div>
                          </div>

                          {/* Features */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Recursos:</h4>
                            <div className="space-y-1">
                              {plan.features.slice(0, 4).map((feature, index) => (
                                <div key={index} className="flex items-center gap-2 text-xs">
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  <span>{feature}</span>
                                </div>
                              ))}
                              {plan.features.length > 4 && (
                                <div className="text-xs text-muted-foreground">
                                  +{plan.features.length - 4} mais recursos
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Estatísticas */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Estatísticas:</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span>Clientes:</span>
                                <span className="font-medium text-blue-600">{plan.active_clients || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Receita:</span>
                                <span className="font-medium text-green-600">{formatCurrency(plan.total_revenue || 0)}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="supplier-plans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Planos para Fornecedores</CardTitle>
                <CardDescription>Gerencie planos de assinatura para fornecedores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {isLoading ? (
                    <div className="col-span-full flex justify-center py-8">
                      <div className="text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Carregando planos...</p>
                      </div>
                    </div>
                  ) : supplierPlans.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <Crown className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">
                        Nenhum plano encontrado
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Crie seu primeiro plano para fornecedores
                      </p>
                    </div>
                  ) : (
                    supplierPlans.map((plan) => (
                      <Card key={plan.id} className={`relative ${plan.is_popular ? 'ring-2 ring-primary' : ''}`}>
                        {plan.is_popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-primary text-primary-foreground px-3 py-1">
                              <Star className="h-3 w-3 mr-1" />
                              Popular
                            </Badge>
                          </div>
                        )}
                        
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-orange-100">
                                <Truck className="h-4 w-4 text-orange-600" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{plan.display_name}</CardTitle>
                                <Badge className={getStatusColor(plan.status)}>
                                  {plan.status === 'active' ? 'Ativo' : 'Inativo'}
                                </Badge>
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
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(plan.id)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => togglePlanStatus(plan.id, plan.status)}>
                                  {plan.status === 'active' ? (
                                    <>
                                      <ToggleLeft className="h-4 w-4 mr-2" />
                                      Desativar
                                    </>
                                  ) : (
                                    <>
                                      <ToggleRight className="h-4 w-4 mr-2" />
                                      Ativar
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDelete(plan.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <CardDescription className="text-sm mt-2">
                            {plan.description}
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {/* Preços */}
                          <div className="text-center border-b pb-4">
                            <div className="flex items-baseline justify-center gap-2">
                              <span className="text-3xl font-bold text-primary">
                                {formatCurrency(plan.monthly_price)}
                              </span>
                              <span className="text-muted-foreground">/mês</span>
                            </div>
                          </div>

                          {/* Limites específicos para fornecedores */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Limites:</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span>Respostas/mês:</span>
                                <span className="font-medium">{plan.max_quote_responses_per_month === -1 ? '∞' : plan.max_quote_responses_per_month || 50}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Produtos:</span>
                                <span className="font-medium">{plan.max_products_in_catalog === -1 ? '∞' : plan.max_products_in_catalog || 100}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Categorias:</span>
                                <span className="font-medium">{plan.max_categories_per_supplier === -1 ? '∞' : plan.max_categories_per_supplier || 10}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Armazenamento:</span>
                                <span className="font-medium">{plan.max_storage_gb}GB</span>
                              </div>
                            </div>
                          </div>

                          {/* Features */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Recursos:</h4>
                            <div className="space-y-1">
                              {plan.features.slice(0, 4).map((feature, index) => (
                                <div key={index} className="flex items-center gap-2 text-xs">
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  <span>{feature}</span>
                                </div>
                              ))}
                              {plan.features.length > 4 && (
                                <div className="text-xs text-muted-foreground">
                                  +{plan.features.length - 4} mais recursos
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Estatísticas */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Estatísticas:</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span>Fornecedores:</span>
                                <span className="font-medium text-orange-600">{plan.suppliers_subscribed || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Receita:</span>
                                <span className="font-medium text-green-600">{formatCurrency(plan.total_revenue || 0)}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Analytics Avançado</h3>
              <p className="text-muted-foreground mb-4">Relatórios detalhados sobre performance dos planos</p>
              <Button>Em desenvolvimento</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Criação de Plano */}
      <CreatePlanModalSupabase
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreatePlan={createPlan}
      />
    </div>
  );
};