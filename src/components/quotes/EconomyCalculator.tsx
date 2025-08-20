import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Calculator, DollarSign } from 'lucide-react';

interface EconomyData {
  totalSavings: number;
  savingsPercentage: number;
  bestPrice: number;
  originalPrice: number;
  supplierCount: number;
  isMultiSupplier: boolean;
}

interface EconomyCalculatorProps {
  data: EconomyData;
  className?: string;
}

export function EconomyCalculator({ data, className = '' }: EconomyCalculatorProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getEconomyLevel = (percentage: number) => {
    if (percentage >= 20) return { level: 'Excelente', class: 'text-green-700 bg-green-100' };
    if (percentage >= 10) return { level: 'Boa', class: 'text-blue-700 bg-blue-100' };
    if (percentage >= 5) return { level: 'Moderada', class: 'text-yellow-700 bg-yellow-100' };
    return { level: 'Baixa', class: 'text-gray-700 bg-gray-100' };
  };

  const economyLevel = getEconomyLevel(data.savingsPercentage);

  return (
    <Card className={`border-green-200 bg-green-50 ${className}`}>
      <CardHeader>
        <CardTitle className="text-green-800 flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Análise de Economia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Economia</span>
            </div>
            <p className="text-2xl font-bold text-green-800">
              {formatCurrency(data.totalSavings)}
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Percentual</span>
            </div>
            <p className="text-2xl font-bold text-green-800">
              {data.savingsPercentage.toFixed(1)}%
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Custo Final</span>
            </div>
            <p className="text-xl font-bold text-green-800">
              {formatCurrency(data.bestPrice)}
            </p>
          </div>
          
          <div className="text-center">
            <span className="text-sm font-medium text-green-600">Nível</span>
            <div className="mt-1">
              <Badge className={economyLevel.class}>
                {economyLevel.level}
              </Badge>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="pt-2 border-t border-green-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-700">
              Preço original: {formatCurrency(data.originalPrice)}
            </span>
            <span className="text-green-700">
              {data.supplierCount} fornecedor{data.supplierCount > 1 ? 'es' : ''}
            </span>
          </div>
          
          {data.isMultiSupplier && (
            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-800 font-medium flex items-center gap-1">
                💡 Estratégia Multi-fornecedor recomendada para máxima economia
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}