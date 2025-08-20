import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, Download, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  price: 30,
  deliveryTime: 20,
  shippingCost: 15,
  sla: 15,
  warranty: 10,
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
    setWeights(prev => ({ ...prev, [criterion]: value }));
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
          {/* Configuração de Pesos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuração de Critérios</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ajuste os pesos conforme a importância de cada critério (Total: {totalWeight}%)
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
                    max={50}
                    min={0}
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
              <CardTitle className="text-lg">Comparação das Propostas</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-8 gap-4 mb-4 text-sm font-medium text-muted-foreground">
                  <div>Fornecedor</div>
                  <div>Preço</div>
                  <div>Prazo</div>
                  <div>Frete</div>
                  <div>SLA</div>
                  <div>Garantia</div>
                  <div>Reputação</div>
                  <div>Score Final</div>
                </div>
                
                {normalizedScores.map((proposal, index) => (
                  <div key={proposal.id} className="grid grid-cols-8 gap-4 p-4 rounded-lg border bg-card mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getBadgeVariant(index)}>
                        {index === 0 && <Trophy className="h-3 w-3 mr-1" />}
                        #{index + 1}
                      </Badge>
                      <span className="font-medium">{proposal.supplierName}</span>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}