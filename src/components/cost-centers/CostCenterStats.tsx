import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TreePine, DollarSign, TrendingUp } from 'lucide-react';
import { CostCenter, CostCenterSpending } from '@/hooks/useCostCenters';

interface CostCenterStatsProps {
  costCenters: CostCenter[];
  spending: CostCenterSpending[];
}

export function CostCenterStats({ costCenters, spending }: CostCenterStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const totalSpent = spending.reduce((acc, item) => acc + item.total_spent, 0);
  const totalBudget = costCenters.reduce((acc, cc) => acc + cc.budget_monthly, 0);
  const averageUtilization = costCenters.length > 0 
    ? Math.round((spending.reduce((acc, item) => {
        const budget = item.budget_monthly || 1;
        return acc + (item.total_spent / budget);
      }, 0) / costCenters.length) * 100)
    : 0;

  return (
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
          <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Orçamento Mensal</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Utilização Média</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageUtilization}%</div>
        </CardContent>
      </Card>
    </div>
  );
}
