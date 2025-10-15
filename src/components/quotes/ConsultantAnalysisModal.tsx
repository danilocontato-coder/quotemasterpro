import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Trophy, 
  Target,
  CheckCircle,
  XCircle,
  Star
} from 'lucide-react';
import { 
  ComparativeConsultantAnalysis, 
  ProposalQualitativeAnalysis 
} from '@/services/ProposalConsultantService';
import { QuoteProposal } from './QuoteDetailModal';

interface ConsultantAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  comparativeAnalysis: ComparativeConsultantAnalysis | null;
  individualAnalyses: Map<string, ProposalQualitativeAnalysis>;
  proposals: QuoteProposal[];
}

export function ConsultantAnalysisModal({
  open,
  onClose,
  comparativeAnalysis,
  individualAnalyses,
  proposals
}: ConsultantAnalysisModalProps) {
  const [selectedProposalId, setSelectedProposalId] = useState<string>(proposals[0]?.id || '');

  const selectedProposal = proposals.find(p => p.id === selectedProposalId);
  const selectedAnalysis = selectedProposalId ? individualAnalyses.get(selectedProposalId) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Análise Completa do Consultor IA
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="individual">Por Proposta</TabsTrigger>
            <TabsTrigger value="comparative">Comparativo</TabsTrigger>
            <TabsTrigger value="strategy">Estratégia</TabsTrigger>
          </TabsList>

          {/* Tab: Visão Geral */}
          <TabsContent value="overview" className="space-y-4">
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4 pr-4">
                {comparativeAnalysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        Resumo Executivo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {comparativeAnalysis.executiveSummary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🏆 Ranking Geral
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {proposals.map((proposal, idx) => {
                      const analysis = individualAnalyses.get(proposal.id);
                      const isRecommended = comparativeAnalysis?.negotiationStrategy.primaryChoice === proposal.supplierName;
                      
                      return (
                        <div key={proposal.id} className={`flex items-center gap-3 p-3 rounded-lg ${isRecommended ? 'bg-primary/10 border-2 border-primary' : 'bg-muted'}`}>
                          <Badge variant={idx === 0 ? 'default' : 'secondary'}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}
                          </Badge>
                          <div className="flex-1">
                            <div className="font-semibold">{proposal.supplierName}</div>
                            <div className="text-xs text-muted-foreground">
                              Score: {analysis?.overallScore || 'N/A'} | 
                              R$ {proposal.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          {isRecommended && (
                            <Badge className="bg-green-600">Recomendado</Badge>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {comparativeAnalysis && comparativeAnalysis.riskWarnings.length > 0 && (
                  <Card className="border-amber-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-5 w-5" />
                        Alertas e Riscos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {comparativeAnalysis.riskWarnings.map((warning, idx) => {
                          const supplier = proposals.find(p => p.id === warning.supplierId);
                          return (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <Badge variant={warning.severity === 'high' ? 'destructive' : 'secondary'} className="mt-0.5">
                                {warning.severity === 'high' ? '❗' : '⚠️'}
                              </Badge>
                              <div>
                                <span className="font-medium">{supplier?.supplierName || 'Fornecedor'}:</span>{' '}
                                {warning.warning}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab: Por Proposta */}
          <TabsContent value="individual" className="space-y-4">
            <Select value={selectedProposalId} onValueChange={setSelectedProposalId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um fornecedor" />
              </SelectTrigger>
              <SelectContent>
                {proposals.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.supplierName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedAnalysis && selectedProposal && (
              <ScrollArea className="h-[55vh]">
                <div className="space-y-4 pr-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-4xl font-bold text-primary">{selectedAnalysis.overallScore}</div>
                          <div className="text-sm text-muted-foreground">Score Geral</div>
                        </div>
                        <Badge variant={selectedAnalysis.recommendations.shouldApprove ? 'default' : 'destructive'} className="text-lg px-4 py-2">
                          {selectedAnalysis.recommendations.shouldApprove ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Recomendado
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Não Recomendado
                            </>
                          )}
                        </Badge>
                      </div>
                      <Progress value={selectedAnalysis.overallScore} className="h-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        🎯 Parecer do Consultor
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {selectedAnalysis.consultantOpinion}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        🏷️ Análise de Marcas e Produtos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-medium mb-1">Reputação das Marcas</div>
                          <p className="text-muted-foreground">{selectedAnalysis.brandAnalysis.brandReputation}</p>
                        </div>
                        <div>
                          <div className="font-medium mb-1">Presença no Mercado</div>
                          <p className="text-muted-foreground">{selectedAnalysis.brandAnalysis.marketPresence}</p>
                        </div>
                        <div>
                          <div className="font-medium mb-1">Confiabilidade</div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 10 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i < selectedAnalysis.brandAnalysis.reliability ? 'fill-amber-400 text-amber-400' : 'text-muted'}`}
                              />
                            ))}
                            <span className="text-xs ml-2">{selectedAnalysis.brandAnalysis.reliability}/10</span>
                          </div>
                        </div>
                        <div>
                          <div className="font-medium mb-1">Qualidade da Garantia</div>
                          <p className="text-muted-foreground">{selectedAnalysis.brandAnalysis.warrantyQuality}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={selectedAnalysis.priceJustification.isPriceJustified ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        💰 Justificativa de Preço
                        <Badge variant={selectedAnalysis.priceJustification.isPriceJustified ? 'default' : 'secondary'}>
                          {selectedAnalysis.priceJustification.costBenefit}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          {selectedAnalysis.priceJustification.isPriceJustified ? '✅ Preço Justificado' : '⚠️ Preço Questionável'}
                        </p>
                        <ul className="space-y-1 ml-4">
                          {selectedAnalysis.priceJustification.reasons.map((reason, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground">• {reason}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedAnalysis.risks.factors.length > 0 && (
                    <Card className="border-amber-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                          Riscos Identificados
                          <Badge variant={selectedAnalysis.risks.level === 'high' ? 'destructive' : 'secondary'}>
                            {selectedAnalysis.risks.level === 'high' ? 'Alto' : selectedAnalysis.risks.level === 'medium' ? 'Médio' : 'Baixo'}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {selectedAnalysis.risks.factors.map((factor, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-amber-600">•</span>
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedAnalysis.recommendations.negotiationPoints.length > 0 && (
                    <Card className="border-blue-200 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-700">
                          💡 Pontos de Negociação
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {selectedAnalysis.recommendations.negotiationPoints.map((point, idx) => (
                            <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                              <span>•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Tab: Comparativo */}
          <TabsContent value="comparative" className="space-y-4">
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4 pr-4">
                {comparativeAnalysis && (
                  <>
                    <Card className="border-primary">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-amber-500" />
                          Melhor Proposta Geral
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="font-semibold text-lg mb-2">
                          {proposals.find(p => p.id === comparativeAnalysis.bestOverall.supplierId)?.supplierName || 'N/A'}
                        </div>
                        <ul className="space-y-1">
                          {comparativeAnalysis.bestOverall.reasons.map((reason, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground">• {reason}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700">
                          <TrendingUp className="h-5 w-5" />
                          Melhor Custo-Benefício
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="font-semibold mb-2">
                          {proposals.find(p => p.id === comparativeAnalysis.bestValueForMoney.supplierId)?.supplierName || 'N/A'}
                        </div>
                        <ul className="space-y-1">
                          {comparativeAnalysis.bestValueForMoney.reasons.map((reason, idx) => (
                            <li key={idx} className="text-sm text-green-700">• {reason}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-blue-200 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-700">
                          <Star className="h-5 w-5" />
                          Melhor Qualidade
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="font-semibold mb-2">
                          {proposals.find(p => p.id === comparativeAnalysis.bestQuality.supplierId)?.supplierName || 'N/A'}
                        </div>
                        <ul className="space-y-1">
                          {comparativeAnalysis.bestQuality.reasons.map((reason, idx) => (
                            <li key={idx} className="text-sm text-blue-700">• {reason}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab: Estratégia */}
          <TabsContent value="strategy" className="space-y-4">
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4 pr-4">
                {comparativeAnalysis && (
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Estratégia de Negociação Recomendada
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-sm font-medium mb-1">Escolha Principal:</div>
                        <div className="text-lg font-semibold text-primary">
                          {comparativeAnalysis.negotiationStrategy.primaryChoice}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-1">Escolha de Backup:</div>
                        <div className="text-base">
                          {comparativeAnalysis.negotiationStrategy.backupChoice}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-2">Pontos de Negociação:</div>
                        <ul className="space-y-2">
                          {comparativeAnalysis.negotiationStrategy.negotiationPoints.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <Badge variant="outline">{idx + 1}</Badge>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-muted p-4 rounded-lg">
                        <div className="text-sm font-medium mb-1">Desconto Esperado:</div>
                        <div className="text-base">{comparativeAnalysis.negotiationStrategy.expectedDiscount}</div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
