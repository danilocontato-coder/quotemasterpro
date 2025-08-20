import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Key, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  DollarSign,
  Target,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MarketAnalysisService } from '@/services/MarketAnalysisService';

interface MarketAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  category: string;
  proposals: Array<{
    id: string;
    supplierName: string;
    price: number;
  }>;
}

export function MarketAnalysisModal({
  open,
  onClose,
  productName,
  category,
  proposals
}: MarketAnalysisModalProps) {
  const [apiKey, setApiKey] = useState(MarketAnalysisService.getApiKey() || '');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [keyValidated, setKeyValidated] = useState(!!MarketAnalysisService.getApiKey());
  const [marketAnalysis, setMarketAnalysis] = useState<any>(null);
  const [supplierAnalyses, setSupplierAnalyses] = useState<any[]>([]);
  const { toast } = useToast();

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Chave obrigatória",
        description: "Digite sua chave da API Perplexity",
        variant: "destructive",
      });
      return;
    }

    setIsTestingKey(true);
    try {
      const isValid = await MarketAnalysisService.testApiKey(apiKey);
      if (isValid) {
        MarketAnalysisService.saveApiKey(apiKey);
        setKeyValidated(true);
        toast({
          title: "Chave válida!",
          description: "API key configurada com sucesso",
        });
      } else {
        toast({
          title: "Chave inválida",
          description: "Verifique sua chave da API Perplexity",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro de conexão",
        description: "Não foi possível validar a chave API",
        variant: "destructive",
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleAnalyzeMarket = async () => {
    if (!keyValidated) {
      toast({
        title: "Configure a API key",
        description: "Primeiro configure sua chave da Perplexity",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await MarketAnalysisService.analyzeMarketPrice(
        productName,
        category
      );

      if (analysis) {
        setMarketAnalysis(analysis);
        
        // Analyze each supplier proposal
        const supplierAnalyses = proposals.map(proposal => ({
          ...proposal,
          analysis: MarketAnalysisService.analyzeSupplierCompetitiveness(
            proposal.price,
            analysis
          )
        }));
        
        setSupplierAnalyses(supplierAnalyses);
        
        toast({
          title: "Análise concluída!",
          description: "Análise de mercado realizada com sucesso",
        });
      }
    } catch (error) {
      console.error('Error analyzing market:', error);
      toast({
        title: "Erro na análise",
        description: error instanceof Error ? error.message : "Erro ao analisar mercado",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getCompetitivenessVariant = (competitiveness: string): "default" | "destructive" | "secondary" | "outline" => {
    const variants = {
      excellent: 'default' as const,
      good: 'default' as const,
      fair: 'secondary' as const,
      poor: 'destructive' as const
    };
    return variants[competitiveness as keyof typeof variants] || 'secondary';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análise Inteligente de Mercado - {productName}
          </DialogTitle>
          <DialogDescription>
            Compare propostas com preços de mercado usando IA e receba recomendações.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* API Key Configuration */}
          {!keyValidated && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-800 flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Configuração da API Perplexity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p>
                        Para análise de mercado inteligente, você precisa configurar sua chave da API Perplexity.
                      </p>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 mb-2">
                          💡 Recomendação: Use a integração nativa com Supabase
                        </p>
                        <p className="text-sm text-blue-700">
                          Para maior segurança e funcionalidades avançadas, conecte seu projeto ao Supabase 
                          clicando no botão verde no canto superior direito da interface.
                        </p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="api-key">Chave da API Perplexity</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleTestApiKey}
                      disabled={isTestingKey}
                      variant="outline"
                    >
                      {isTestingKey ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Validar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Controls */}
          {keyValidated && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Produto para Análise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{productName}</h3>
                    <p className="text-sm text-muted-foreground">Categoria: {category}</p>
                    <p className="text-sm text-muted-foreground">{proposals.length} propostas para comparar</p>
                  </div>
                  <Button
                    onClick={handleAnalyzeMarket}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BarChart3 className="h-4 w-4" />
                    )}
                    {isAnalyzing ? 'Analisando...' : 'Analisar Mercado'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Market Analysis Results */}
          {marketAnalysis && (
            <>
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-800 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Análise de Mercado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
                      <DollarSign className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                      <div className="text-lg font-bold text-blue-900">
                        {formatCurrency(marketAnalysis.averagePrice)}
                      </div>
                      <div className="text-sm text-blue-600">Preço Médio de Mercado</div>
                    </div>
                    
                    <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
                      <div className="text-lg font-bold text-blue-900 flex items-center justify-center gap-1">
                        {MarketAnalysisService.getMarketTrendIcon(marketAnalysis.marketTrend)}
                        {MarketAnalysisService.getMarketTrendLabel(marketAnalysis.marketTrend)}
                      </div>
                      <div className="text-sm text-blue-600">Tendência do Mercado</div>
                    </div>
                    
                    <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
                      <div className="text-lg font-bold text-blue-900">
                        {formatCurrency(marketAnalysis.priceRange.min)} - {formatCurrency(marketAnalysis.priceRange.max)}
                      </div>
                      <div className="text-sm text-blue-600">Faixa de Preços</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white rounded-lg border border-blue-200">
                    <h4 className="font-medium mb-2">Análise de Mercado:</h4>
                    <p className="text-sm text-gray-700">{marketAnalysis.analysis}</p>
                  </div>
                  
                  {marketAnalysis.recommendations && marketAnalysis.recommendations.length > 0 && (
                    <div className="p-4 bg-white rounded-lg border border-blue-200">
                      <h4 className="font-medium mb-2">Recomendações:</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {marketAnalysis.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-600">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Supplier Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Análise Competitiva dos Fornecedores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {supplierAnalyses.map((supplier, index) => {
                      const analysis = supplier.analysis;
                      return (
                        <div
                          key={supplier.id}
                          className="p-4 border rounded-lg bg-card"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="font-medium">{supplier.supplierName}</h3>
                              <p className="text-sm text-muted-foreground">
                                Proposta: {formatCurrency(supplier.price)}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant={getCompetitivenessVariant(analysis.competitiveness)}>
                                {MarketAnalysisService.getCompetitivenessLabel(analysis.competitiveness)}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Posição no Mercado:</span>
                              <div className="font-medium">
                                {MarketAnalysisService.getMarketPositionLabel(analysis.marketPosition)}
                              </div>
                            </div>
                            
                            <div>
                              <span className="text-muted-foreground">Variação do Mercado:</span>
                              <div className={`font-medium flex items-center gap-1 ${
                                analysis.priceVariation < 0 ? 'text-green-600' : 
                                analysis.priceVariation > 10 ? 'text-red-600' : 'text-yellow-600'
                              }`}>
                                {analysis.priceVariation < 0 ? (
                                  <TrendingDown className="h-3 w-3" />
                                ) : (
                                  <TrendingUp className="h-3 w-3" />
                                )}
                                {analysis.priceVariation > 0 ? '+' : ''}{analysis.priceVariation.toFixed(1)}%
                              </div>
                            </div>
                            
                            <div>
                              <span className="text-muted-foreground">Competitividade:</span>
                              <div className={`font-medium ${MarketAnalysisService.getCompetitivenessColor(analysis.competitiveness)}`}>
                                {MarketAnalysisService.getCompetitivenessLabel(analysis.competitiveness)}
                              </div>
                            </div>
                          </div>
                          
                          {analysis.priceVariation < -15 && (
                            <Alert className="mt-3 border-green-200 bg-green-50">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <AlertDescription className="text-green-800">
                                <strong>Excelente oportunidade!</strong> Este fornecedor está oferecendo um preço muito competitivo, 
                                {Math.abs(analysis.priceVariation).toFixed(1)}% abaixo da média de mercado.
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {analysis.priceVariation > 15 && (
                            <Alert className="mt-3 border-orange-200 bg-orange-50">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <AlertDescription className="text-orange-800">
                                <strong>Preço elevado:</strong> Este fornecedor está cobrando {analysis.priceVariation.toFixed(1)}% 
                                acima da média de mercado. Considere negociar ou buscar outras opções.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <Separator />

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}