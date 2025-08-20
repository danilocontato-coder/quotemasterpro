import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  CheckCircle,
  Target,
  DollarSign
} from 'lucide-react';

interface MarketInsight {
  productName: string;
  marketPrice: number;
  supplierPrice: number;
  trend: 'rising' | 'falling' | 'stable';
  confidence: number;
  competitiveness: 'excellent' | 'good' | 'fair' | 'poor';
  priceVariation: number;
  quantity: number;
}

interface ItemMarketInsightsProps {
  insights: MarketInsight[];
  className?: string;
}

export function ItemMarketInsights({ insights, className = '' }: ItemMarketInsightsProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return <TrendingUp className="h-3 w-3 text-red-500" />;
      case 'falling': return <TrendingDown className="h-3 w-3 text-green-500" />;
      default: return <Minus className="h-3 w-3 text-gray-500" />;
    }
  };

  const getCompetitivenessIcon = (competitiveness: string) => {
    switch (competitiveness) {
      case 'excellent': return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'good': return <CheckCircle className="h-3 w-3 text-blue-600" />;
      case 'fair': return <Target className="h-3 w-3 text-yellow-600" />;
      case 'poor': return <AlertTriangle className="h-3 w-3 text-red-600" />;
      default: return <Target className="h-3 w-3 text-gray-600" />;
    }
  };

  const getCompetitivenessColor = (competitiveness: string) => {
    switch (competitiveness) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'fair': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const totalSavings = insights.reduce((sum, insight) => {
    const savingPerItem = insight.marketPrice - insight.supplierPrice;
    return sum + (savingPerItem > 0 ? savingPerItem * insight.quantity : 0);
  }, 0);

  const totalValue = insights.reduce((sum, insight) => {
    return sum + (insight.supplierPrice * insight.quantity);
  }, 0);

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Insights de Mercado ({insights.length} itens)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {totalSavings > 0 && (
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Economia Potencial</p>
                <p className="text-xs text-green-600">Baseado nos preços de mercado</p>
              </div>
              <p className="text-lg font-bold text-green-600">
                R$ {totalSavings.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Item Insights */}
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div key={index} className="p-3 border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{insight.productName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getCompetitivenessColor(insight.competitiveness)}`}
                    >
                      <span className="mr-1">{getCompetitivenessIcon(insight.competitiveness)}</span>
                      {insight.competitiveness === 'excellent' ? 'Excelente' :
                       insight.competitiveness === 'good' ? 'Bom' :
                       insight.competitiveness === 'fair' ? 'Razoável' : 'Ruim'
                      }
                    </Badge>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(insight.trend)}
                      <span className="text-xs text-muted-foreground">
                        {insight.trend === 'rising' ? 'Em alta' :
                         insight.trend === 'falling' ? 'Em baixa' : 'Estável'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    insight.priceVariation <= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {insight.priceVariation > 0 ? '+' : ''}{insight.priceVariation.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Mercado</p>
                  <p className="font-medium">R$ {insight.marketPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fornecedor</p>
                  <p className="font-medium">R$ {insight.supplierPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Confiança</p>
                  <div className="flex items-center gap-1">
                    <Progress value={insight.confidence * 100} className="h-1 flex-1" />
                    <span className="font-medium">{Math.round(insight.confidence * 100)}%</span>
                  </div>
                </div>
              </div>

              {insight.quantity > 1 && (
                <div className="mt-2 pt-2 border-t">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">
                      Impacto total ({insight.quantity}x)
                    </span>
                    <span className={`font-medium ${
                      insight.priceVariation <= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {insight.priceVariation <= 0 ? 'Economia' : 'Sobrecusto'}: R$ {
                        Math.abs((insight.marketPrice - insight.supplierPrice) * insight.quantity).toFixed(2)
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}