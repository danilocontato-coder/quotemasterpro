import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, TreePine, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useCurrentClient } from '@/hooks/useCurrentClient';
import { CreateCostCenterModal } from '@/components/cost-centers/CreateCostCenterModal';
import { EditCostCenterModal } from '@/components/cost-centers/EditCostCenterModal';
import { CostCenterAnalysisCard } from '@/components/cost-centers/CostCenterAnalysisCard';
import { BudgetVarianceChart } from '@/components/cost-centers/BudgetVarianceChart';

export default function CostCenters() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<any>(null);
  const { currentClient: client } = useCurrentClient();
  const { costCenters, spending, isLoading, fetchHierarchy, fetchSpending, deleteCostCenter, createDefaultCostCenters } = useCostCenters();

  // Fetch hierarchy and spending data automatically on mount
  useEffect(() => {
    fetchHierarchy();
    fetchSpending();
  }, [fetchHierarchy, fetchSpending]);

  const handleCreateDefaults = async () => {
    await createDefaultCostCenters();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este centro de custo?')) {
      await deleteCostCenter(id);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getBudgetStatus = (spent: number, budget: number) => {
    if (budget === 0) return { variant: 'secondary', text: 'Sem orçamento' };
    const percentage = (spent / budget) * 100;
    
    if (percentage > 100) return { variant: 'destructive', text: 'Excedido' };
    if (percentage > 80) return { variant: 'warning', text: 'Atenção' };
    return { variant: 'success', text: 'OK' };
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Centros de Custo</h1>
          <p className="text-muted-foreground">Gerencie os centros de custo e analise os gastos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Centro de Custo
          </Button>
          {costCenters.length === 0 && (
            <Button variant="outline" onClick={createDefaultCostCenters}>
              Criar Centros Padrão
            </Button>
          )}
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Centros Ativos</CardTitle>
            <TreePine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costCenters.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto Total (Mês)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(spending.reduce((acc, item) => acc + item.total_spent, 0))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orçamento Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(costCenters.reduce((acc, cc) => acc + cc.budget_monthly, 0))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilização Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {costCenters.length > 0 
                ? Math.round((spending.reduce((acc, item) => acc + (item.total_spent / item.budget_monthly || 0), 0) / costCenters.length) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CostCenterAnalysisCard spending={spending} />
        <BudgetVarianceChart spending={spending} />
      </div>

      {/* Cost Centers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Centros de Custo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {costCenters.map((costCenter) => {
              const spendingData = spending.find(s => s.cost_center_id === costCenter.id);
              const budgetStatus = getBudgetStatus(spendingData?.total_spent || 0, costCenter.budget_monthly);
              
              return (
                <div key={costCenter.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold">{costCenter.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Código: {costCenter.code}
                          {costCenter.description && ` • ${costCenter.description}`}
                        </p>
                        {costCenter.path && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Hierarquia: {costCenter.path}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(spendingData?.total_spent || 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        de {formatCurrency(costCenter.budget_monthly)}
                      </div>
                    </div>

                    <Badge variant={budgetStatus.variant as any}>
                      {budgetStatus.text}
                    </Badge>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingCostCenter(costCenter)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(costCenter.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {costCenters.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <div className="space-y-4">
                  <p>Nenhum centro de custo encontrado.</p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button variant="link" onClick={() => setShowCreateModal(true)}>
                      Criar primeiro centro de custo
                    </Button>
                    <span className="text-muted-foreground">ou</span>
                    <Button variant="link" onClick={createDefaultCostCenters}>
                      Criar centros padrão
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground mt-4 space-y-2">
                    <p><strong>Centros padrão incluem:</strong></p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span>• Administração e Gestão (R$ 12.000/mês)</span>
                      <span>• Manutenção Predial (R$ 15.000/mês)</span>
                      <span>• Limpeza e Conservação (R$ 8.000/mês)</span>
                      <span>• Segurança e Vigilância (R$ 10.000/mês)</span>
                      <span>• Jardinagem e Paisagismo (R$ 3.000/mês)</span>
                      <span>• Água e Esgoto (R$ 5.000/mês)</span>
                      <span>• Energia Elétrica (R$ 7.000/mês)</span>
                      <span>• Elevadores (R$ 4.000/mês)</span>
                      <span>• Obras e Reformas (R$ 10.000/mês)</span>
                      <span>• Material de Escritório (R$ 1.500/mês)</span>
                      <span>• Comunicação e Marketing (R$ 2.000/mês)</span>
                      <span>• Reserva de Emergência (R$ 5.000/mês)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateCostCenterModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        parentOptions={costCenters}
      />

      {editingCostCenter && (
        <EditCostCenterModal
          open={!!editingCostCenter}
          onOpenChange={() => setEditingCostCenter(null)}
          costCenter={editingCostCenter}
          parentOptions={costCenters.filter(cc => cc.id !== editingCostCenter.id)}
        />
      )}
    </div>
  );
}