import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Info,
  DollarSign,
  Target
} from 'lucide-react';
import { ItemAnalysisResult } from '@/hooks/useItemAnalysis';
import { MarketAnalysisService } from '@/services/MarketAnalysisService';

interface ItemAnalysisCardProps {
  analysisResult: ItemAnalysisResult;
  onRetry?: () => void;
  showSupplierComparison?: boolean;
}

export function ItemAnalysisCard({ 
  analysisResult, 
  onRetry, 
  showSupplierComparison = true 
}: ItemAnalysisCardProps) {
  const { item, analysis, competitiveness, isLoading, error } = analysisResult;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'falling': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'rising': return 'text-red-600 bg-red-50';
      case 'falling': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCompetitivenessIcon = (competitiveness: string) => {
    switch (competitiveness) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'good': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'fair': return <Info className="h-4 w-4 text-yellow-600" />;
      case 'poor': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{item.productName}</CardTitle>
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
          </div>
          <p className="text-xs text-muted-foreground">{item.category}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{item.productName}</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-xs text-muted-foreground">{item.category}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-red-600">{error}</p>
            {onRetry && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRetry}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{item.productName}</CardTitle>
          <p className="text-xs text-muted-foreground">{item.category}</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Análise não disponível</p>
        </CardContent>
      </Card>
    );
  }

  const confidencePercentage = Math.round(analysis.confidence * 100);
  const priceVariation = competitiveness?.priceVariation || 0;

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{item.productName}</CardTitle>
          <div className="flex items-center gap-1">
            {getTrendIcon(analysis.marketTrend)}
            <Badge variant="secondary" className={`text-xs ${getTrendColor(analysis.marketTrend)}`}>
              {MarketAnalysisService.getMarketTrendLabel(analysis.marketTrend)}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{item.category}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price Information */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Preço Médio Mercado</p>
            <p className="text-sm font-semibold text-blue-600">
              R$ {analysis.averagePrice.toFixed(2)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Faixa de Preços</p>
            <p className="text-xs text-gray-600">
              R$ {analysis.priceRange.min.toFixed(2)} - R$ {analysis.priceRange.max.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Supplier Comparison */}
        {showSupplierComparison && item.supplierPrice && competitiveness && (
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Preço do Fornecedor</p>
              <div className="flex items-center gap-1">
                {getCompetitivenessIcon(competitiveness.competitiveness)}
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${MarketAnalysisService.getCompetitivenessColor(competitiveness.competitiveness)}`}
                >
                  {MarketAnalysisService.getCompetitivenessLabel(competitiveness.competitiveness)}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">R$ {item.supplierPrice.toFixed(2)}</p>
              <div className="text-right">
                <p className={`text-xs font-medium ${priceVariation <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {priceVariation > 0 ? '+' : ''}{priceVariation.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {MarketAnalysisService.getMarketPositionLabel(competitiveness.marketPosition)}
                </p>
              </div>
            </div>

            {/* Target Price Recommendation */}
            {Math.abs(priceVariation) > 10 && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded">
                <Target className="h-3 w-3 text-blue-600" />
                <div>
                  <p className="text-xs text-blue-800 font-medium">Preço-alvo sugerido:</p>
                  <p className="text-xs text-blue-600">
                    R$ {(analysis.averagePrice * 0.95).toFixed(2)} - R$ {(analysis.averagePrice * 1.05).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confidence and Market Analysis */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Confiabilidade</p>
            <p className="text-xs font-medium">{confidencePercentage}%</p>
          </div>
          <Progress value={confidencePercentage} className="h-1" />
        </div>

        {/* Key Recommendations */}
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-700">Recomendação Principal:</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              {analysis.recommendations[0]}
            </p>
          </div>
        )}

        {/* Quantity Impact */}
        {item.quantity && item.quantity > 1 && item.supplierPrice && (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Impacto Total ({item.quantity}x)
              </p>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  R$ {(item.supplierPrice * item.quantity).toFixed(2)}
                </p>
                {competitiveness && Math.abs(priceVariation) > 5 && (
                  <p className={`text-xs ${priceVariation <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {priceVariation > 0 ? 'Sobrecusto' : 'Economia'}: R$ {Math.abs((item.supplierPrice - analysis.averagePrice) * item.quantity).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}