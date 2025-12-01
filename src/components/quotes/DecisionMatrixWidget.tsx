import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { WeightConfig, ProposalMetrics, calculateWeightedScore, DEFAULT_WEIGHT_TEMPLATES } from '@/utils/decisionMatrixCalculator';
import { WeightEditorModal } from './WeightEditorModal';
import { NegotiationConfirmModal } from './NegotiationConfirmModal';
import { NegotiationResultModal } from './NegotiationResultModal';
import { ProposalCard } from './ProposalCard';
import { DollarSign, Clock, Package, Shield, Star, Zap, Save, CheckCircle, Settings, Brain, FileDown } from 'lucide-react';
import { exportDecisionMatrixToPDF } from '@/utils/exportDecisionMatrixPDF';
import { QuoteProposal } from './QuoteDetailModal';
import { isQuoteLocked as checkQuoteLocked } from '@/utils/statusUtils';
import { useSavedDecisionMatrices } from '@/hooks/useSavedDecisionMatrices';
import { useAINegotiation } from '@/hooks/useAINegotiation';
import { useToast } from '@/hooks/use-toast';

interface DecisionMatrixWidgetProps {
  proposals: QuoteProposal[];
  quoteItems: QuoteItem[];
  quoteId: string;
  quoteName: string;
  quoteLocalCode?: string;
  defaultOpen?: boolean;
  onApprove?: (proposal: QuoteProposal) => void;
  quoteStatus: string;
}

interface QuoteItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price?: number;
  total?: number;
}

export const DecisionMatrixWidget: React.FC<DecisionMatrixWidgetProps> = ({
  proposals,
  quoteItems,
  quoteId,
  quoteName,
  quoteLocalCode,
  defaultOpen = false,
  onApprove,
  quoteStatus
}) => {
  const isQuoteLocked = checkQuoteLocked(quoteStatus);
  const [showWeightEditor, setShowWeightEditor] = useState(false);
  const [weights, setWeights] = useState<WeightConfig>(DEFAULT_WEIGHT_TEMPLATES.equilibrado);
  const [isSaving, setIsSaving] = useState(false);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<QuoteProposal | null>(null);
  const [negotiationAttempts, setNegotiationAttempts] = useState<Record<string, number>>({});
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [negotiationResult, setNegotiationResult] = useState<'success' | 'failure'>('failure');
  const [negotiatedTerms, setNegotiatedTerms] = useState<any>(null);
  
  const { saveMatrix } = useSavedDecisionMatrices();
  const { startAnalysis, startNegotiation, getNegotiationByQuoteId } = useAINegotiation();
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
        deliveryScore: p.deliveryScore || 50,
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

  const getActionButtons = (proposal: any, index: number, topScore: number) => {
    const isWinner = index === 0;
    const scoreDiff = topScore - proposal.score;
    const isViableForAI = proposal.score >= 70 && scoreDiff <= 15;

    return {
      showApprove: true,
      showNegotiate: !isWinner && (index <= 2 || isViableForAI),
      approveLabel: isWinner ? 'Aprovar Melhor Proposta' : 'Aprovar Proposta',
      negotiateLabel: index === 1 
        ? `Tentar Negociar (${scoreDiff.toFixed(1)} pts do líder)`
        : 'Negociar com IA'
    };
  };

  const handleSaveWeights = (newWeights: WeightConfig) => {
    setWeights(newWeights);
  };

  const handleSaveMatrix = () => {
    setIsSaving(true);
    saveMatrix({
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
    setTimeout(() => setIsSaving(false), 1000);
  };

  const handleExportPDF = () => {
    exportDecisionMatrixToPDF({
      quoteName,
      quoteCode: quoteLocalCode ? `#${quoteLocalCode}` : `#${quoteId.substring(0, 8).toUpperCase()}`,
      weights,
      rankedProposals: rankedProposals.map(r => ({
        id: r.id,
        name: r.name,
        score: r.score,
        metrics: r.metrics,
        proposal: {
          totalPrice: r.proposal.totalPrice,
          deliveryTime: r.proposal.deliveryTime,
          shippingCost: r.proposal.shippingCost,
          warrantyMonths: r.proposal.warrantyMonths
        }
      })),
      quoteItems
    });
    
    toast({
      title: 'PDF exportado!',
      description: 'Documento pronto para apresentacao.',
    });
  };

  const handleConfirmNegotiation = async () => {
    if (!selectedProposal) return;
    
    setShowNegotiationModal(false);
    setIsNegotiating(true);
    
    try {
      // 1. Iniciar análise se não existir
      const existingNegotiation = getNegotiationByQuoteId(quoteId);
      let negotiationId = existingNegotiation?.id;
      
      console.log('🔵 [DecisionMatrix] existingNegotiation:', existingNegotiation);
      console.log('🔵 [DecisionMatrix] negotiationId inicial:', negotiationId);
      
      if (!negotiationId) {
        console.log('🔵 [DecisionMatrix] Criando nova análise para quoteId:', quoteId);
        const analysis = await startAnalysis(quoteId);
        console.log('🔵 [DecisionMatrix] Resposta de startAnalysis:', analysis);
        
        // ✅ CORREÇÃO: startAnalysis agora retorna AINegotiation diretamente
        negotiationId = analysis?.id;
        console.log('🔵 [DecisionMatrix] negotiationId extraído:', negotiationId);
      }
      
      // ✅ Validação antes de continuar
      if (!negotiationId) {
        throw new Error('Não foi possível obter o ID da negociação. Tente novamente.');
      }
      
      // 2. Iniciar negociação
      console.log('🔵 [DecisionMatrix] Chamando startNegotiation com ID:', negotiationId);
      const result = await startNegotiation(negotiationId);
      
      // 3. Incrementar contador de tentativas
      setNegotiationAttempts(prev => ({
        ...prev,
        [selectedProposal.id]: (prev[selectedProposal.id] || 0) + 1
      }));
      
      // 4. Simular resultado (em produção, viria da edge function)
      const mockSuccess = Math.random() > 0.5;
      setNegotiationResult(mockSuccess ? 'success' : 'failure');
      
      if (mockSuccess) {
        setNegotiatedTerms({
          price: selectedProposal.totalPrice * 0.92,
          deliveryTime: Math.max(1, selectedProposal.deliveryTime - 2),
          warrantyMonths: selectedProposal.warrantyMonths + 3
        });
      }
      
      setShowResultModal(true);
      
      toast({
        title: "Negociação concluída",
        description: mockSuccess ? "A IA conseguiu negociar melhores condições!" : "O fornecedor manteve a proposta original.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao negociar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsNegotiating(false);
      setSelectedProposal(null);
    }
  };

  const handleRetryNegotiation = () => {
    setShowResultModal(false);
    setShowNegotiationModal(true);
  };

  const weightItems = [
    { key: 'price' as const, label: 'Preço', icon: DollarSign, color: 'bg-green-100 text-green-700' },
    { key: 'deliveryTime' as const, label: 'Prazo', icon: Clock, color: 'bg-blue-100 text-blue-700' },
    { key: 'shippingCost' as const, label: 'Frete', icon: Package, color: 'bg-orange-100 text-orange-700' },
    { key: 'warranty' as const, label: 'Garantia', icon: Shield, color: 'bg-purple-100 text-purple-700' },
    { key: 'deliveryScore' as const, label: 'Pontualidade', icon: Zap, color: 'bg-yellow-100 text-yellow-700' },
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
      <Collapsible open={true} className="w-full">
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">📊</div>
                <div>
                  <CardTitle className="text-lg">Matriz de Decisão - Análise Ponderada</CardTitle>
                  {winner && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Vencedor: <span className="font-semibold text-foreground">{winner.name}</span> ({winner.score.toFixed(1)} pontos)
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="bg-primary/10">
                {proposals.length} propostas
              </Badge>
            </div>
          </CardHeader>

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
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Salvando...' : 'Salvar Matriz'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportPDF}
                    className="flex items-center gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    Exportar PDF
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
                {rankedProposals.map((item, index) => {
                  const buttons = getActionButtons(item, index, rankedProposals[0].score);
                  const attempts = negotiationAttempts[item.id] || 0;

                  return (
                    <ProposalCard
                      key={item.id}
                      proposal={item.proposal}
                      rank={index}
                      score={item.score}
                      isWinner={index === 0}
                      quoteItems={quoteItems}
                      isQuoteLocked={isQuoteLocked}
                      onApprove={() => onApprove?.(item.proposal)}
                      onNegotiate={() => {
                        setSelectedProposal(item.proposal);
                        setShowNegotiationModal(true);
                      }}
                      canNegotiate={buttons.showNegotiate && attempts < 2}
                      negotiationAttempts={attempts}
                      allProposals={rankedProposals.map(r => r.proposal)}
                    />
                  );
                })}
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

      {selectedProposal && (
        <>
          <NegotiationConfirmModal
            open={showNegotiationModal}
            onClose={() => setShowNegotiationModal(false)}
            onConfirm={handleConfirmNegotiation}
            proposalDetails={{
              supplierName: selectedProposal.supplierName,
              totalPrice: selectedProposal.totalPrice,
              currentScore: rankedProposals.find(p => p.id === selectedProposal.id)?.score || 0
            }}
          />

          <NegotiationResultModal
            open={showResultModal}
            onClose={() => setShowResultModal(false)}
            result={negotiationResult}
            original={{
              price: selectedProposal.totalPrice,
              deliveryTime: selectedProposal.deliveryTime,
              warrantyMonths: selectedProposal.warrantyMonths
            }}
            negotiated={negotiatedTerms}
            remainingAttempts={2 - (negotiationAttempts[selectedProposal.id] || 0)}
            onApproveNegotiated={() => {
              setShowResultModal(false);
              onApprove?.(selectedProposal);
            }}
            onApproveOriginal={() => {
              setShowResultModal(false);
              onApprove?.(selectedProposal);
            }}
            onRetry={handleRetryNegotiation}
          />
        </>
      )}
    </>
  );
};
