import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Download,
  Settings,
  Database,
  X
} from 'lucide-react';
import { useItemAnalysis, ItemAnalysisData } from '@/hooks/useItemAnalysis';
import { ItemAnalysisCard } from './ItemAnalysisCard';
import { MarketAnalysisService } from '@/services/MarketAnalysisService';
import { useToast } from '@/hooks/use-toast';

interface ItemAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  items: ItemAnalysisData[];
  title?: string;
}

export function ItemAnalysisModal({ 
  open, 
  onClose, 
  items, 
  title = "🧩 Combinação Inteligente - Melhores Preços por Item"
}: ItemAnalysisModalProps) {
  const { toast } = useToast();
  const {
    analyses,
    isAnalyzing,
    progress,
    analyzeMultipleItems,
    analyzeItem,
    clearAnalyses
  } = useItemAnalysis();

  const [showCacheStats, setShowCacheStats] = useState(false);
  const [cacheStats, setCacheStats] = useState({ totalItems: 0, totalSize: 0 });

  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  useEffect(() => {
    if (open && items.length > 0 && !hasAutoStarted) {
      // Auto-start analysis when modal opens (only once)
      handleAnalyzeAll();
      setHasAutoStarted(true);
    }
    if (!open) {
      // Reset auto-start flag when modal closes
      setHasAutoStarted(false);
    }
  }, [open, items, hasAutoStarted]);

  useEffect(() => {
    if (showCacheStats) {
      setCacheStats(MarketAnalysisService.getCacheStats());
    }
  }, [showCacheStats]);

  const handleAnalyzeAll = async () => {
    try {
      await analyzeMultipleItems(items);
      toast({
        title: "Análise concluída!",
        description: `${items.length} itens analisados com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro na análise",
        description: "Algumas análises falharam. Verifique sua conexão e chave da API.",
        variant: "destructive",
      });
    }
  };

  const handleRetryItem = async (item: ItemAnalysisData) => {
    try {
      await analyzeItem(item);
      toast({
        title: "Item reanalisado!",
        description: `${item.productName} foi analisado novamente.`,
      });
    } catch (error) {
      toast({
        title: "Erro na análise",
        description: `Falha ao analisar ${item.productName}.`,
        variant: "destructive",
      });
    }
  };

  const handleClearCache = () => {
    MarketAnalysisService.clearCache();
    setCacheStats({ totalItems: 0, totalSize: 0 });
    toast({
      title: "Cache limpo!",
      description: "Cache de análises foi limpo com sucesso.",
    });
  };

  const handleExportData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      items: analyses.map(result => ({
        item: result.item,
        analysis: result.analysis,
        competitiveness: result.competitiveness,
        error: result.error
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analise-mercado-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Dados exportados!",
      description: "Análise foi exportada em formato JSON.",
    });
  };

  const completedAnalyses = analyses.filter(a => !a.isLoading && !a.error);
  const failedAnalyses = analyses.filter(a => a.error);
  const loadingAnalyses = analyses.filter(a => a.isLoading);

  const totalSavings = completedAnalyses.reduce((sum, result) => {
    if (result.analysis && result.item.supplierPrice && result.item.quantity) {
      const marketPrice = result.analysis.averagePrice;
      const supplierPrice = result.item.supplierPrice;
      const saving = (marketPrice - supplierPrice) * result.item.quantity;
      return sum + (saving > 0 ? saving : 0);
    }
    return sum;
  }, 0);

  const totalPotentialCost = completedAnalyses.reduce((sum, result) => {
    if (result.analysis && result.item.quantity) {
      return sum + (result.analysis.averagePrice * result.item.quantity);
    }
    return sum;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{title}</DialogTitle>
              <DialogDescription>
                Monte a compra ideal combinando os melhores preços de cada fornecedor • {items.length} item(ns)
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="analysis" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis">
              Análise ({completedAnalyses.length}/{items.length})
            </TabsTrigger>
            <TabsTrigger value="summary">
              Resumo Executivo
            </TabsTrigger>
            <TabsTrigger value="settings">
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-4">
            {/* Progress Bar */}
            {isAnalyzing && (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Analisando itens...</p>
                      <p className="text-sm text-muted-foreground">
                        {progress.completed}/{progress.total}
                      </p>
                    </div>
                    <Progress 
                      value={(progress.completed / progress.total) * 100} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                onClick={handleAnalyzeAll}
                disabled={isAnalyzing}
                className="flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4" />
                )}
                {isAnalyzing ? 'Analisando...' : 'Analisar Todos'}
              </Button>

              {completedAnalyses.length > 0 && (
                <Button 
                  variant="outline"
                  onClick={handleExportData}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar Dados
                </Button>
              )}
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analyses.map((result, index) => (
                <ItemAnalysisCard
                  key={`${result.item.productName}-${index}`}
                  analysisResult={result}
                  onRetry={() => handleRetryItem(result.item)}
                  showSupplierComparison={true}
                />
              ))}
            </div>

            {/* Empty State */}
            {analyses.length === 0 && !isAnalyzing && (
              <Card>
                <CardContent className="p-8 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Pronto para Análise</h3>
                  <p className="text-muted-foreground mb-4">
                    Clique em "Analisar Todos" para iniciar a análise de mercado dos itens.
                  </p>
                  <Button onClick={handleAnalyzeAll}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Iniciar Análise
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Analisados</p>
                      <p className="text-2xl font-bold">{completedAnalyses.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Falharam</p>
                      <p className="text-2xl font-bold">{failedAnalyses.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Economia Potencial</p>
                      <p className="text-xl font-bold text-green-600">
                        R$ {totalSavings.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Valor de Mercado</p>
                      <p className="text-xl font-bold">
                        R$ {totalPotentialCost.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Competitive Analysis */}
            {completedAnalyses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Análise Competitiva</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {completedAnalyses.map((result, index) => {
                      if (!result.competitiveness || !result.item.supplierPrice) return null;
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-sm">{result.item.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              Mercado: R$ {result.analysis.averagePrice.toFixed(2)} | 
                              Fornecedor: R$ {result.item.supplierPrice.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant="secondary"
                              className={MarketAnalysisService.getCompetitivenessColor(result.competitiveness.competitiveness)}
                            >
                              {MarketAnalysisService.getCompetitivenessLabel(result.competitiveness.competitiveness)}
                            </Badge>
                            <p className={`text-xs mt-1 ${result.competitiveness.priceVariation <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {result.competitiveness.priceVariation > 0 ? '+' : ''}{result.competitiveness.priceVariation.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Cache de Análises
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setShowCacheStats(!showCacheStats)}
                  >
                    {showCacheStats ? 'Ocultar' : 'Mostrar'} Estatísticas
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleClearCache}
                  >
                    Limpar Cache
                  </Button>
                </div>

                {showCacheStats && (
                  <div className="p-4 bg-gray-50 rounded">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Itens em cache:</p>
                        <p className="font-semibold">{cacheStats.totalItems}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tamanho do cache:</p>
                        <p className="font-semibold">{cacheStats.totalSize} KB</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  <p>• O cache armazena análises por 24 horas</p>
                  <p>• Análises idênticas usam o cache automaticamente</p>
                  <p>• Máximo de 3 análises simultâneas para evitar sobrecarga</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações da API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Chave da API:</strong> {MarketAnalysisService.getApiKey() ? '✅ Configurada' : '❌ Não configurada'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Configure sua chave da Perplexity AI nas configurações da aplicação.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}