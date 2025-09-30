import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import { CostCenter, CostCenterSpending } from '@/hooks/useCostCenters';

interface CostCenterListProps {
  costCenters: CostCenter[];
  spending: CostCenterSpending[];
  onEdit: (costCenter: CostCenter) => void;
  onDelete: (id: string) => void;
  onCreateDefault: () => void;
  onCreateNew: () => void;
}

export function CostCenterList({ 
  costCenters, 
  spending, 
  onEdit, 
  onDelete,
  onCreateDefault,
  onCreateNew 
}: CostCenterListProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getBudgetStatus = (spent: number, budget: number) => {
    if (budget === 0) return { variant: 'secondary' as const, text: 'Sem orçamento' };
    const percentage = (spent / budget) * 100;
    
    if (percentage > 100) return { variant: 'destructive' as const, text: 'Excedido' };
    if (percentage > 80) return { variant: 'outline' as const, text: 'Atenção' };
    return { variant: 'default' as const, text: 'OK' };
  };

  return (
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

                  <Badge variant={budgetStatus.variant}>
                    {budgetStatus.text}
                  </Badge>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(costCenter)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(costCenter.id)}
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
                  <Button variant="link" onClick={onCreateNew}>
                    Criar primeiro centro de custo
                  </Button>
                  <span className="text-muted-foreground">ou</span>
                  <Button variant="link" onClick={onCreateDefault}>
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
  );
}
