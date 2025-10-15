import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { WeightConfig, ProposalMetrics, calculateWeightedScore, DEFAULT_WEIGHT_TEMPLATES } from '@/utils/decisionMatrixCalculator';
import { WeightEditorModal } from './WeightEditorModal';
import { ChevronDown, ChevronUp, Settings, DollarSign, Clock, Package, Shield, Star, Zap, Save, CheckCircle } from 'lucide-react';
import { QuoteProposal } from './QuoteDetailModal';
import { useSavedDecisionMatrices } from '@/hooks/useSavedDecisionMatrices';
import { useToast } from '@/hooks/use-toast';

interface DecisionMatrixWidgetProps {
  proposals: QuoteProposal[];
  quoteId: string;
  quoteName: string;
  defaultOpen?: boolean;
  onApprove?: (proposal: QuoteProposal) => void;
}

export const DecisionMatrixWidget: React.FC<DecisionMatrixWidgetProps> = ({
  proposals,
  quoteId,
  quoteName,
  defaultOpen = false,
  onApprove
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);
  const [showWeightEditor, setShowWeightEditor] = useState(false);
  const [weights, setWeights] = useState<WeightConfig>(DEFAULT_WEIGHT_TEMPLATES.equilibrado);
  const { saveMatrix } = useSavedDecisionMatrices();
  const { toast } = useToast();

  // Converter propostas para métricas
  const proposalMetrics = useMemo(() => 
    proposals.map(p => ({
      id: p.id,
      name: p.supplierName,
      metrics: {
        price: p.totalPrice,
        deliveryTime: p.deliveryTime,
        shippingCost: p.shippingCost,
        sla: p.sla,
        warranty: p.warrantyMonths,
        reputation: p.reputation
      } as ProposalMetrics,
      proposal: p
    })),
    [proposals]
  );

  // Calcular scores
  const rankedProposals = useMemo(() => {
    const allMetrics = proposalMetrics.map(p => p.metrics);
    
    const scored = proposalMetrics.map(p => ({
      ...p,
      score: calculateWeightedScore(p.metrics, allMetrics, weights)
    }));

    return scored.sort((a, b) => b.score - a.score);
  }, [proposalMetrics, weights]);

  const winner = rankedProposals[0];

  const handleSaveWeights = (newWeights: WeightConfig) => {
    setWeights(newWeights);
  };

  const handleSaveMatrix = () => {
    saveMatrix.mutate({
      name: `Matriz - ${quoteName}`,
      quote_id: quoteId,
      quote_title: quoteName,
      weights: weights as any,
      proposals: rankedProposals.map(r => ({
        id: r.id,
        name: r.name,
        score: r.score,
        metrics: r.metrics
      })) as any
    });
  };

  const weightItems = [
    { key: 'price' as const, label: 'Preço', icon: DollarSign, color: 'bg-green-100 text-green-700' },
    { key: 'deliveryTime' as const, label: 'Prazo', icon: Clock, color: 'bg-blue-100 text-blue-700' },
    { key: 'shippingCost' as const, label: 'Frete', icon: Package, color: 'bg-orange-100 text-orange-700' },
    { key: 'warranty' as const, label: 'Garantia', icon: Shield, color: 'bg-purple-100 text-purple-700' },
    { key: 'sla' as const, label: 'SLA', icon: Zap, color: 'bg-yellow-100 text-yellow-700' },
    { key: 'reputation' as const, label: 'Reputação', icon: Star, color: 'bg-amber-100 text-amber-700' },
  ];

  const getMedalEmoji = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}º`;
    }
  };

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className="border-2 border-primary/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">📊</div>
                  <div>
                    <CardTitle className="text-lg">Matriz de Decisão - Análise Ponderada</CardTitle>
                    {!isExpanded && winner && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Vencedor: <span className="font-semibold text-foreground">{winner.name}</span> ({winner.score.toFixed(1)} pontos)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10">
                    {proposals.length} propostas
                  </Badge>
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-6 pt-6">
              {/* Actions */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Avaliação baseada em pesos configuráveis para cada critério
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowWeightEditor(true)}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Personalizar Pesos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveMatrix}
                    disabled={saveMatrix.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Salvar Matriz
                  </Button>
                </div>
              </div>

              {/* Active Weights */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {weightItems.map(({ key, label, icon: Icon, color }) => (
                  <div key={key} className={`p-3 rounded-lg ${color}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{label}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{weights[key]}</span>
                      <span className="text-xs">%</span>
                    </div>
                    <div className="mt-2 h-1 bg-white/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-current" 
                        style={{ width: `${weights[key]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Ranking */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  🏆 Ranking Ponderado
                </h4>
                {rankedProposals.map((item, index) => (
                  <Card key={item.id} className={index === 0 ? 'border-2 border-green-500 shadow-lg' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="text-2xl">{getMedalEmoji(index)}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-base">{item.name}</span>
                              {index === 0 && (
                                <Badge className="bg-green-100 text-green-800 border-green-300">
                                  Melhor Escolha
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                R$ {item.metrics.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {item.metrics.deliveryTime}d
                              </span>
                              <span className="flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                {item.metrics.warranty}m
                              </span>
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {item.metrics.reputation}/5
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {item.score.toFixed(1)}
                            </div>
                            <div className="text-xs text-muted-foreground">pontos</div>
                          </div>
                          {index === 0 && onApprove && (
                            <Button
                              size="sm"
                              onClick={() => onApprove(item.proposal)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Info */}
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                💡 <strong>Como funciona:</strong> Cada proposta é avaliada em 6 dimensões (preço, prazo, frete, garantia, SLA, reputação). 
                Os valores são normalizados (0-100) e multiplicados pelos pesos configurados. O score final indica a melhor escolha considerando seus critérios.
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <WeightEditorModal
        open={showWeightEditor}
        onClose={() => setShowWeightEditor(false)}
        initialWeights={weights}
        onSave={handleSaveWeights}
      />
    </>
  );
};
