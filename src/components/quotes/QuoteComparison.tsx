import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Save, Download, Trophy, BarChart3, CheckCircle, Sparkles, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ItemAnalysisModal } from './ItemAnalysisModal';
import type { ItemAnalysisData } from '@/hooks/useItemAnalysis';
import { useDecisionMatrixTemplates } from '@/hooks/useDecisionMatrixTemplates';
import { useSavedDecisionMatrices } from '@/hooks/useSavedDecisionMatrices';
import { ComparisonProgressBar } from './ComparisonProgressBar';
import { ProposalDetailsTooltip } from './ProposalDetailsTooltip';

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
  onProposalApproved?: () => void;
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
  onProposalApproved,
}: QuoteComparisonProps) {
  const [weights, setWeights] = useState<ComparisonCriteria>(defaultWeights);
  const [isMarketAnalysisOpen, setIsMarketAnalysisOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [itemsForAnalysis, setItemsForAnalysis] = useState<ItemAnalysisData[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [showWeights, setShowWeights] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const { toast } = useToast();
  const { templates, isLoading: templatesLoading } = useDecisionMatrixTemplates();
  const { saveMatrix } = useSavedDecisionMatrices();

  const handleOpenMarketAnalysis = async () => {
    try {
      setIsLoadingItems(true);
      const quoteId = proposals[0]?.quoteId;
      if (!quoteId) {
        toast({
          title: 'Sem itens',
          description: 'Não foi possível identificar a cotação para buscar os itens.',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase
        .from('quote_items')
        .select('product_name, quantity, unit_price')
        .eq('quote_id', quoteId);

      if (error) throw error;

      const items: ItemAnalysisData[] = (data || []).map((row: any) => ({
        productName: row.product_name || 'Item',
        category: 'Geral',
        supplierPrice: row.unit_price ?? undefined,
        quantity: row.quantity ?? 1,
      }));

      setItemsForAnalysis(items);
      setIsMarketAnalysisOpen(true);
    } catch (err) {
      console.error('Erro ao carregar itens da cotação:', err);
      toast({
        title: 'Erro ao carregar itens',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingItems(false);
    }
  };

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
    const timestamp = new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const autoName = `Análise - ${quoteTitle} - ${timestamp}`;
    const quoteId = proposals[0]?.quoteId || '';

    saveMatrix({
      name: autoName,
      quote_id: quoteId,
      quote_title: quoteTitle,
      weights,
      proposals: normalizedScores,
    });
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setWeights(template.weights);
      toast({
        title: 'Template aplicado',
        description: `Template "${template.name}" aplicado com sucesso.`,
      });
    }
  };

  const handleApproveProposal = async (proposal: any, isRecommended: boolean = false) => {
    if (isApproving) return;
    
    setIsApproving(true);
    try {
      // Chamar edge function que lida com aprovação (respeita níveis de aprovação)
      const { data, error } = await supabase.functions.invoke('approve-proposal', {
        body: {
          responseId: proposal.id,
          quoteId: proposal.quoteId,
          comments: isRecommended 
            ? 'Proposta recomendada aprovada através do sistema de comparação inteligente'
            : `Proposta escolhida manualmente através do sistema de comparação inteligente (Score: ${proposal.finalScore.toFixed(1)})`
        }
      });

      if (error) throw error;

      // Verificar se foi enviado para aprovação ou aprovado direto
      const requiresApproval = data?.requiresApproval || false;
      
      if (requiresApproval) {
        toast({
          title: "📋 Enviado para Aprovação!",
          description: `Proposta do fornecedor ${proposal.supplierName} foi enviada para aprovação.`,
        });
      } else {
        toast({
          title: "✅ Proposta Aprovada!",
          description: `Fornecedor ${proposal.supplierName} foi notificado via WhatsApp`,
        });
      }

      // Call callback to refresh quotes
      onProposalApproved?.();
      
      // Close modal
      onClose();
      
    } catch (error) {
      console.error('Error approving proposal:', error);
      toast({
        title: "❌ Erro",
        description: "Erro ao aprovar proposta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
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

  const criteriaLabels: Record<keyof ComparisonCriteria, string> = {
    price: 'Preço',
    deliveryTime: 'Prazo',
    shippingCost: 'Frete',
    sla: 'SLA',
    warranty: 'Garantia',
    reputation: 'Reputação'
  };

  const weightsSummary = Object.entries(weights)
    .map(([key, value]) => `${criteriaLabels[key as keyof ComparisonCriteria]} (${value}%)`)
    .join(' • ');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Comparador Inteligente
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenMarketAnalysis}
                disabled={isLoadingItems}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analisar Mercado
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTemplates(!showTemplates)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Templates
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Templates Modal/Section */}
          {showTemplates && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Label htmlFor="template-select" className="text-sm font-medium">Aplicar Template Pré-Configurado</Label>
                  <Select value={selectedTemplateId} onValueChange={(value) => {
                    setSelectedTemplateId(value);
                    applyTemplate(value);
                  }}>
                    <SelectTrigger id="template-select" className="bg-background">
                      <SelectValue placeholder="Selecione um template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{template.name}</span>
                            {template.description && (
                              <span className="text-xs text-muted-foreground">{template.description}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recomendação do Sistema - Compacta */}
          {bestProposal && (
            <Card className="border-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <Badge className="h-8 px-3">
                      <Trophy className="h-4 w-4 mr-1" />
                      #1
                    </Badge>
                    <div>
                      <h3 className="font-semibold text-base">{bestProposal.supplierName}</h3>
                      <p className="text-sm text-muted-foreground">
                        R$ {bestProposal.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • {bestProposal.deliveryTime} dias
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{bestProposal.finalScore.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                    <Button
                      onClick={() => handleApproveProposal(bestProposal, true)}
                      disabled={isApproving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isApproving ? 'Processando...' : 'Aprovar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resumo de Critérios - Collapsible */}
          <div className="space-y-2">
            <Collapsible open={showWeights} onOpenChange={setShowWeights}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="text-sm font-medium">Critérios: {weightsSummary}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {showWeights ? '▲ Ocultar' : '▼ Ajustar'}
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card>
                  <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(weights).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <Label className="text-sm font-medium">
                          {criteriaLabels[key as keyof ComparisonCriteria]}
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
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Tabela Simplificada - 5 Colunas */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-4 pb-2 border-b text-xs font-medium text-muted-foreground">
                  <div>Fornecedor</div>
                  <div>Valor Total</div>
                  <div>Prazo</div>
                  <div>Score</div>
                  <div>Ação</div>
                </div>
                
                {normalizedScores.map((proposal, index) => (
                  <div 
                    key={proposal.id} 
                    className={`grid grid-cols-5 gap-4 p-3 rounded-lg border ${
                      index === 0 ? 'bg-primary/5 border-primary/20' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={getBadgeVariant(index)} className="shrink-0">
                        #{index + 1}
                      </Badge>
                      <ProposalDetailsTooltip
                        proposal={{
                          supplierName: proposal.supplierName,
                          sla: `${proposal.sla}h`,
                          warranty: `${proposal.warrantyMonths} meses`,
                          reputation: proposal.reputation,
                          shippingCost: proposal.shippingCost
                        }}
                      >
                        <button className="font-medium text-sm text-left hover:underline">
                          {proposal.supplierName}
                        </button>
                      </ProposalDetailsTooltip>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      R$ {(proposal.price + proposal.shippingCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    
                    <div className="flex items-center text-sm">
                      {proposal.deliveryTime} dias
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-full">
                        <ComparisonProgressBar value={proposal.finalScore} showValue={true} />
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Button
                        size="sm"
                        variant={index === 0 ? 'default' : 'outline'}
                        onClick={() => handleApproveProposal(proposal, index === 0)}
                        disabled={isApproving}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Aprovar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Footer Ações - Simplificado */}
          <div className="flex justify-end gap-2">
            <Button onClick={saveDecisionMatrix} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Salvar Análise
            </Button>
            <Button onClick={exportComparison} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>

          {/* Market Analysis Modal */}
          <ItemAnalysisModal
            open={isMarketAnalysisOpen}
            onClose={() => setIsMarketAnalysisOpen(false)}
            items={itemsForAnalysis}
            title={`Análise de Mercado - Itens da Cotação`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}