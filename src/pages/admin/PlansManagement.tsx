import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Percent,
  FileText,
  Package
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSupabaseSubscriptionPlans } from '@/hooks/useSupabaseSubscriptionPlans';
import { CreatePlanModalSupabase } from '@/components/admin/CreatePlanModalSupabase';
import { EditPlanModal } from '@/components/admin/EditPlanModal';
import { ViewPlanModal } from '@/components/admin/ViewPlanModal';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [viewingPlan, setViewingPlan] = useState<any>(null);

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

  const handleEdit = (plan: any) => {
    if (showViewModal) return; // Prevenir abertura simultânea
    setEditingPlan(plan);
    setShowEditModal(true);
  };

  const handleView = (plan: any) => {
    if (showEditModal) return; // Prevenir abertura simultânea
    setViewingPlan(plan);
    setShowViewModal(true);
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
    setTimeout(() => setEditingPlan(null), 300); // Cleanup após animação
  };

  const handleCloseView = () => {
    setShowViewModal(false);
    setTimeout(() => setViewingPlan(null), 300); // Cleanup após animação
  };

  // Failsafe: Remove pointer-events residual quando todos os modais estão fechados
  useEffect(() => {
    if (!showCreateModal && !showEditModal && !showViewModal) {
      const root = document.getElementById('root');
      if (root && root.style.pointerEvents === 'none') {
        root.style.pointerEvents = '';
      }
      
      // Remove pointer-events: none de elementos órfãos (sem inert/aria-hidden)
      document.querySelectorAll<HTMLElement>('[style*="pointer-events"]').forEach((el) => {
        const hasInert = el.hasAttribute('inert');
        const ariaHidden = el.getAttribute('aria-hidden') === 'true';
        if (!hasInert && !ariaHidden && el.style.pointerEvents === 'none') {
          el.style.pointerEvents = '';
        }
      });
    }
  }, [showCreateModal, showEditModal, showViewModal]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Planos</h1>
            <p className="text-muted-foreground">Configure planos baseados nos dados do Supabase</p>
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
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
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
          </CardContent>
        </Card>

        {/* Tabs de Audiência */}
        <div className="flex justify-center">
          <Tabs 
            value={filterAudience} 
            onValueChange={(v) => setFilterAudience(v as typeof filterAudience)}
            className="w-full max-w-md"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="clients">
                <Building2 className="h-4 w-4 mr-2" />
                Clientes
              </TabsTrigger>
              <TabsTrigger value="suppliers">
                <Truck className="h-4 w-4 mr-2" />
                Fornecedores
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Planos Grid baseado no modelo da imagem */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-8">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Carregando planos...</p>
              </div>
            </div>
          ) : plans.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <Crown className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Nenhum plano encontrado
              </h3>
              <p className="text-sm text-muted-foreground">
                {filterAudience === 'all' 
                  ? 'Crie seu primeiro plano' 
                  : filterAudience === 'clients'
                    ? 'Nenhum plano para clientes encontrado'
                    : 'Nenhum plano para fornecedores encontrado'
                }
              </p>
            </div>
          ) : (
            plans.map((plan) => (
              <Card key={plan.id} className={`relative transition-all hover:shadow-lg ${
                plan.is_popular ? 'ring-2 ring-primary border-primary/50' : ''
              }`}>
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1 shadow-lg">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={plan.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {plan.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background border">
                        <DropdownMenuItem onClick={() => handleView(plan)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(plan)}>
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

                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CardTitle className="text-xl">{plan.display_name}</CardTitle>
                    {plan.target_audience === 'clients' && (
                      <Badge variant="outline" className="border-blue-500 text-blue-700">
                        <Building2 className="h-3 w-3 mr-1" />
                        Clientes
                      </Badge>
                    )}
                    {plan.target_audience === 'suppliers' && (
                      <Badge variant="outline" className="border-green-500 text-green-700">
                        <Truck className="h-3 w-3 mr-1" />
                        Fornecedores
                      </Badge>
                    )}
                    {plan.target_audience === 'both' && (
                      <Badge variant="outline" className="border-purple-500 text-purple-700">
                        Ambos
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-sm">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Preços */}
                  <div className="text-center py-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold text-primary">
                        {formatCurrency(plan.monthly_price)}
                      </span>
                      <span className="text-muted-foreground text-sm">/mês</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(plan.yearly_price)}/ano
                      </span>
                      {calculateYearlyDiscount(plan.monthly_price, plan.yearly_price) > 0 && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          <Percent className="h-3 w-3 mr-1" />
                          {calculateYearlyDiscount(plan.monthly_price, plan.yearly_price)}% desconto
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Limites */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Limites:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Cotações/mês:</span>
                        <span className="font-semibold text-primary">{plan.max_quotes === -1 ? '∞' : plan.max_quotes}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Usuários:</span>
                        <span className="font-semibold text-primary">{plan.max_users === -1 ? '∞' : plan.max_users}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Fornecedores:</span>
                        <span className="font-semibold text-primary">{plan.max_suppliers === -1 ? '∞' : plan.max_suppliers}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Armazenamento:</span>
                        <span className="font-semibold text-primary">{plan.max_storage_gb}GB</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Recursos */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Recursos:</h4>
                    <div className="space-y-2">
                      {plan.features && plan.features.length > 0 ? (
                        plan.features.slice(0, 4).map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>PDF Export</span>
                        </div>
                      )}
                      {plan.features && plan.features.length > 4 && (
                        <div className="text-xs text-muted-foreground">
                          +{plan.features.length - 4} mais recursos
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Estatísticas */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Estatísticas:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Clientes:</span>
                        <span className="font-bold text-blue-600">{plan.clients_subscribed || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Receita:</span>
                        <span className="font-bold text-green-600">{formatCurrency(plan.total_revenue || 0)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <CreatePlanModalSupabase
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreatePlan={createPlan}
      />

      {editingPlan && (
        <EditPlanModal
          plan={editingPlan}
          open={showEditModal}
          onClose={handleCloseEdit}
        />
      )}

      {viewingPlan && (
        <ViewPlanModal
          plan={viewingPlan}
          open={showViewModal}
          onClose={handleCloseView}
        />
      )}
    </div>
  );
};

export default PlansManagement;