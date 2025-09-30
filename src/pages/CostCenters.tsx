import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCostCenters } from '@/hooks/useCostCenters';
import { CreateCostCenterModal } from '@/components/cost-centers/CreateCostCenterModal';
import { EditCostCenterModal } from '@/components/cost-centers/EditCostCenterModal';
import { CostCenterAnalysisCard } from '@/components/cost-centers/CostCenterAnalysisCard';
import { BudgetVarianceChart } from '@/components/cost-centers/BudgetVarianceChart';
import { CostCenterStats } from '@/components/cost-centers/CostCenterStats';
import { CostCenterList } from '@/components/cost-centers/CostCenterList';

export default function CostCenters() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<any>(null);
  const { costCenters, spending, isLoading, fetchSpending, deleteCostCenter, createDefaultCostCenters } = useCostCenters();

  // Fetch spending data automatically on mount and when cost centers change
  useEffect(() => {
    if (costCenters.length > 0) {
      fetchSpending();
    }
  }, [costCenters.length, fetchSpending]);

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este centro de custo?')) {
      await deleteCostCenter(id);
    }
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
      <CostCenterStats costCenters={costCenters} spending={spending} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CostCenterAnalysisCard spending={spending} />
        <BudgetVarianceChart spending={spending} />
      </div>

      {/* Cost Centers List */}
      <CostCenterList
        costCenters={costCenters}
        spending={spending}
        onEdit={setEditingCostCenter}
        onDelete={handleDelete}
        onCreateDefault={createDefaultCostCenters}
        onCreateNew={() => setShowCreateModal(true)}
      />

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
