import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingDown, Shield, Zap } from 'lucide-react';

interface SummaryMetricsProps {
  totalSavingsOpportunity: number;
  riskScore: number;
  efficiencyScore: number;
}

export const SummaryMetrics: React.FC<SummaryMetricsProps> = ({
  totalSavingsOpportunity,
  riskScore,
  efficiencyScore
}) => {
  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-600';
    if (score < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-600 rounded-lg">
              <TrendingDown className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Oportunidade de Economia</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {totalSavingsOpportunity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Nível de Risco</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-2xl font-bold ${getRiskColor(riskScore)}`}>
                  {riskScore}
                </p>
                <p className="text-sm text-muted-foreground">/100</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600 rounded-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Score de Eficiência</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-2xl font-bold ${getEfficiencyColor(efficiencyScore)}`}>
                  {efficiencyScore}
                </p>
                <p className="text-sm text-muted-foreground">/100</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
