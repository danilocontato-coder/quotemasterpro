import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank,
  Calculator,
  BarChart3
} from 'lucide-react';

interface FinancialData {
  totalSpent: number;
  totalSaved: number;
  averageDiscount: number;
  bestSavings: {
    amount: number;
    percentage: number;
    supplier: string;
    quote: string;
  };
  monthlyTrend: {
    current: number;
    previous: number;
    change: number;
  };
  topExpenseCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

interface FinancialAnalysisCardProps {
  data: FinancialData;
  period: string;
}

export const FinancialAnalysisCard: React.FC<FinancialAnalysisCardProps> = ({ 
  data, 
  period 
}) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);

  const formatPercentage = (value: number) => 
    `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Gasto Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.totalSpent)}</div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            {data.monthlyTrend.change >= 0 ? (
              <TrendingUp className="h-3 w-3 text-red-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-green-500" />
            )}
            <span className={data.monthlyTrend.change >= 0 ? 'text-red-500' : 'text-green-500'}>
              {formatPercentage(data.monthlyTrend.change)} vs mês anterior
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Economia Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Economia Total</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(data.totalSaved)}
          </div>
          <div className="text-xs text-muted-foreground">
            Desconto médio: {data.averageDiscount.toFixed(1)}%
          </div>
        </CardContent>
      </Card>

      {/* Melhor Economia */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Melhor Economia</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(data.bestSavings.amount)}
          </div>
          <div className="space-y-1">
            <Badge variant="secondary">
              {data.bestSavings.percentage.toFixed(1)}% desconto
            </Badge>
            <div className="text-xs text-muted-foreground">
              <div>{data.bestSavings.supplier}</div>
              <div>Cotação: {data.bestSavings.quote}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Principais Categorias de Gasto */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Principais Categorias de Gasto - {period}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topExpenseCategories.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{category.category}</div>
                    <div className="text-sm text-muted-foreground">
                      {category.percentage.toFixed(1)}% do total
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(category.amount)}</div>
                  <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};