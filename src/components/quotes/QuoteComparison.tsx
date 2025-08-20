import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, Download, Trophy, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MarketAnalysisModal } from './MarketAnalysisModal';

export interface QuoteProposal {
  id: string;
  quoteId: string;
  supplierId: string;
  supplierName: string;
  price: number;
  deliveryTime: number; // dias
  shippingCost: number;
  sla: number; // horas
  warrantyMonths: number;
  reputation: number; // 1-5 estrelas
  observations?: string;
  submittedAt: string;
}

export interface ComparisonCriteria {
  price: number;
  deliveryTime: number;
  shippingCost: number;
  sla: number;
  warranty: number;
  reputation: number;
}

interface QuoteComparisonProps {
  open: boolean;
  onClose: () => void;
  proposals: QuoteProposal[];
  quoteTitle: string;
}

const defaultWeights: ComparisonCriteria = {
  price: 25,
  deliveryTime: 20,
  shippingCost: 15,
  sla: 15,
  warranty: 15,
  reputation: 10,
};

export function QuoteComparison({
  open,
  onClose,
  proposals,
  quoteTitle,
}: QuoteComparisonProps) {
  const [weights, setWeights] = useState<ComparisonCriteria>(defaultWeights);
  const [matrixName, setMatrixName] = useState('');
  const [isMarketAnalysisOpen, setIsMarketAnalysisOpen] = useState(false);
  const { toast } = useToast();

  // Normalize scores (0-100 scale)
  const normalizedScores = useMemo(() => {
    if (proposals.length === 0) return [];

    const scores = proposals.map(proposal => {
      // For price and shipping (lower is better)
      const maxPrice = Math.max(...proposals.map(p => p.price));
      const minPrice = Math.min(...proposals.map(p => p.price));
      const priceScore = maxPrice === minPrice ? 100 : ((maxPrice - proposal.price) / (maxPrice - minPrice)) * 100;

      const maxShipping = Math.max(...proposals.map(p => p.shippingCost));
      const minShipping = Math.min(...proposals.map(p => p.shippingCost));
      const shippingScore = maxShipping === minShipping ? 100 : ((maxShipping - proposal.shippingCost) / (maxShipping - minShipping)) * 100;

      // For delivery time (lower is better)
      const maxDelivery = Math.max(...proposals.map(p => p.deliveryTime));
      const minDelivery = Math.min(...proposals.map(p => p.deliveryTime));
      const deliveryScore = maxDelivery === minDelivery ? 100 : ((maxDelivery - proposal.deliveryTime) / (maxDelivery - minDelivery)) * 100;

      // For SLA (lower is better)
      const maxSla = Math.max(...proposals.map(p => p.sla));
      const minSla = Math.min(...proposals.map(p => p.sla));
      const slaScore = maxSla === minSla ? 100 : ((maxSla - proposal.sla) / (maxSla - minSla)) * 100;

      // For warranty and reputation (higher is better)
      const maxWarranty = Math.max(...proposals.map(p => p.warrantyMonths));
      const minWarranty = Math.min(...proposals.map(p => p.warrantyMonths));
      const warrantyScore = maxWarranty === minWarranty ? 100 : ((proposal.warrantyMonths - minWarranty) / (maxWarranty - minWarranty)) * 100;

      const maxReputation = Math.max(...proposals.map(p => p.reputation));
      const minReputation = Math.min(...proposals.map(p => p.reputation));
      const reputationScore = maxReputation === minReputation ? 100 : ((proposal.reputation - minReputation) / (maxReputation - minReputation)) * 100;

      const finalScore = (
        (priceScore * weights.price) +
        (deliveryScore * weights.deliveryTime) +
        (shippingScore * weights.shippingCost) +
        (slaScore * weights.sla) +
        (warrantyScore * weights.warranty) +
        (reputationScore * weights.reputation)
      ) / 100;

      return {
        ...proposal,
        scores: {
          price: priceScore,
          deliveryTime: deliveryScore,
          shippingCost: shippingScore,
          sla: slaScore,
          warranty: warrantyScore,
          reputation: reputationScore,
        },
        finalScore,
      };
    });

    return scores.sort((a, b) => b.finalScore - a.finalScore);
  }, [proposals, weights]);

  const updateWeight = (criterion: keyof ComparisonCriteria, value: number) => {
    const newWeights = { ...weights };
    const oldValue = weights[criterion];
    const difference = value - oldValue;
    
    // Update the changed criterion
    newWeights[criterion] = value;
    
    // Calculate remaining weight to distribute
    const otherCriteria = Object.keys(weights).filter(key => key !== criterion) as (keyof ComparisonCriteria)[];
    const totalOthers = otherCriteria.reduce((sum, key) => sum + weights[key], 0);
    
    if (totalOthers > 0) {
      // Distribute the difference proportionally among other criteria
      const targetTotal = 100 - value;
      const scaleFactor = targetTotal / totalOthers;
      
      otherCriteria.forEach(key => {
        newWeights[key] = Math.max(0, Math.round(weights[key] * scaleFactor));
      });
      
      // Ensure total is exactly 100
      const currentTotal = Object.values(newWeights).reduce((sum, val) => sum + val, 0);
      if (currentTotal !== 100) {
        const adjustment = 100 - currentTotal;
        // Apply adjustment to the largest other criterion
        const largestOther = otherCriteria.reduce((max, key) => 
          newWeights[key] > newWeights[max] ? key : max
        );
        newWeights[largestOther] = Math.max(0, newWeights[largestOther] + adjustment);
      }
    }
    
    setWeights(newWeights);
  };

  const saveDecisionMatrix = () => {
    if (!matrixName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para salvar a matriz de decisão.",
        variant: "destructive",
      });
      return;
    }

    const matrix = {
      name: matrixName,
      quoteTitle,
      weights,
      proposals: normalizedScores,
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage for now (in real app, save to backend)
    const savedMatrices = JSON.parse(localStorage.getItem('decision-matrices') || '[]');
    savedMatrices.push(matrix);
    localStorage.setItem('decision-matrices', JSON.stringify(savedMatrices));

    toast({
      title: "Matriz salva!",
      description: "Matriz de decisão salva com sucesso.",
    });
    
    setMatrixName('');
  };

  const exportComparison = () => {
    const data = {
      title: `Comparação: ${quoteTitle}`,
      weights,
      results: normalizedScores.map(score => ({
        fornecedor: score.supplierName,
        preco: `R$ ${score.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        prazoEntrega: `${score.deliveryTime} dias`,
        frete: `R$ ${score.shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        sla: `${score.sla}h`,
        garantia: `${score.warrantyMonths} meses`,
        reputacao: `${score.reputation}/5`,
        scoreTotal: score.finalScore.toFixed(1),
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparacao-${quoteTitle.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Comparação exportada!",
      description: "Arquivo JSON baixado com sucesso.",
    });
  };

  const getBadgeVariant = (position: number) => {
    switch (position) {
      case 0: return 'default'; // Melhor
      case 1: return 'secondary'; // Segundo
      default: return 'outline'; // Demais
    }
  };

  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const bestProposal = normalizedScores.length > 0 ? normalizedScores[0] : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Comparador Inteligente - {quoteTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Análise de Mercado */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Análise Inteligente de Mercado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-200">
                <div>
                  <h3 className="text-lg font-bold text-green-900">Comparação com Preços de Mercado</h3>
                  <p className="text-sm text-green-700">
                    Use IA para comparar propostas com preços reais do mercado brasileiro
                  </p>
                </div>
                <Button
                  onClick={() => setIsMarketAnalysisOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analisar Mercado
                </Button>
              </div>
              <div className="mt-3 p-3 bg-green-100 rounded-lg">
                <p className="text-sm text-green-800">
                  🧠 <strong>Análise com IA</strong>: Compare automaticamente os preços propostos com a média do mercado brasileiro, 
                  identificando oportunidades de economia e fornecedores mais competitivos.
                  <br />
                  <span className="text-xs">💡 Configure sua API key Perplexity para funcionalidade completa</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recomendação do Sistema */}
          {bestProposal && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Recomendação do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-blue-200">
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">{bestProposal.supplierName}</h3>
                    <p className="text-sm text-blue-700">
                      Melhor opção baseada nos critérios definidos
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-blue-600">
                      <span>Preço: R$ {bestProposal.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span>•</span>
                      <span>Prazo: {bestProposal.deliveryTime} dias</span>
                      <span>•</span>
                      <span>Reputação: {bestProposal.reputation}/5 ⭐</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">{bestProposal.finalScore.toFixed(1)}</div>
                    <div className="text-sm text-blue-600">Score Final</div>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800">
                    📊 <strong>Baseado nos seus critérios</strong>, recomendamos a compra do fornecedor{' '}
                    <strong>{bestProposal.supplierName}</strong> que oferece a melhor relação 
                    custo-benefício com score de <strong>{bestProposal.finalScore.toFixed(1)} pontos</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configuração de Pesos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuração de Critérios</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ajuste os pesos conforme a importância de cada critério (Total: {totalWeight}%)
                {totalWeight !== 100 && (
                  <span className="text-red-600 font-medium"> - Os pesos serão ajustados automaticamente para 100%</span>
                )}
              </p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(weights).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label className="text-sm font-medium">
                    {key === 'price' && 'Preço'}
                    {key === 'deliveryTime' && 'Prazo de Entrega'}
                    {key === 'shippingCost' && 'Frete'}
                    {key === 'sla' && 'SLA'}
                    {key === 'warranty' && 'Garantia'}
                    {key === 'reputation' && 'Reputação'}
                    <span className="ml-2 font-normal text-muted-foreground">({value}%)</span>
                  </Label>
                  <Slider
                    value={[value]}
                    onValueChange={(newValue) => updateWeight(key as keyof ComparisonCriteria, newValue[0])}
                    max={80}
                    min={5}
                    step={5}
                    className="w-full"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tabela de Comparação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comparação Detalhada das Propostas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Análise completa de todas as propostas com scores individuais por critério
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-8 gap-4 mb-4 text-sm font-medium text-muted-foreground border-b pb-2">
                  <div>Fornecedor</div>
                  <div>Preço ({weights.price}%)</div>
                  <div>Prazo ({weights.deliveryTime}%)</div>
                  <div>Frete ({weights.shippingCost}%)</div>
                  <div>SLA ({weights.sla}%)</div>
                  <div>Garantia ({weights.warranty}%)</div>
                  <div>Reputação ({weights.reputation}%)</div>
                  <div>Score Final</div>
                </div>
                
                {normalizedScores.map((proposal, index) => (
                  <div key={proposal.id} className={`grid grid-cols-8 gap-4 p-4 rounded-lg border mb-2 ${
                    index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-card'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Badge variant={getBadgeVariant(index)} className="shrink-0">
                        {index === 0 && <Trophy className="h-3 w-3 mr-1" />}
                        #{index + 1}
                      </Badge>
                      <div>
                        <span className="font-medium">{proposal.supplierName}</span>
                        {index === 0 && (
                          <div className="text-xs text-blue-600 font-medium">RECOMENDADO</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span>R$ {proposal.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      {proposal.price === Math.min(...proposals.map(p => p.price)) && (
                        <TrendingDown className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span>{proposal.deliveryTime} dias</span>
                      {proposal.deliveryTime === Math.min(...proposals.map(p => p.deliveryTime)) && (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span>R$ {proposal.shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      {proposal.shippingCost === Math.min(...proposals.map(p => p.shippingCost)) && (
                        <TrendingDown className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span>{proposal.sla}h</span>
                      {proposal.sla === Math.min(...proposals.map(p => p.sla)) && (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span>{proposal.warrantyMonths} meses</span>
                      {proposal.warrantyMonths === Math.max(...proposals.map(p => p.warrantyMonths)) && (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span>{proposal.reputation}/5 ⭐</span>
                      {proposal.reputation === Math.max(...proposals.map(p => p.reputation)) && (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                    
                    <div className="flex items-center">
                      <Badge variant={index === 0 ? 'default' : 'secondary'} className="font-bold">
                        {proposal.finalScore.toFixed(1)}
                        {index === 0 && ' 🏆'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="matrix-name">Nome da Matriz de Decisão</Label>
              <Input
                id="matrix-name"
                placeholder="Ex: Materiais de Construção - Janeiro 2025"
                value={matrixName}
                onChange={(e) => setMatrixName(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={saveDecisionMatrix} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Salvar Matriz
              </Button>
              
              <Button onClick={exportComparison} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Market Analysis Modal */}
          <MarketAnalysisModal
            open={isMarketAnalysisOpen}
            onClose={() => setIsMarketAnalysisOpen(false)}
            productName={quoteTitle}
            category="Produtos Gerais"
            proposals={proposals.map(p => ({
              id: p.id,
              supplierName: p.supplierName,
              price: p.price
            }))}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}