import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, CheckCircle, AlertTriangle, TrendingUp, Eye } from 'lucide-react';
import { ComparativeConsultantAnalysis } from '@/services/ProposalConsultantService';
import { QuoteProposal } from './QuoteDetailModal';

interface ConsultantAnalysisCardProps {
  analysis: ComparativeConsultantAnalysis;
  proposals: QuoteProposal[];
  onApprove?: (proposalId: string) => void;
  onViewDetails?: () => void;
  isApproving?: boolean;
}

export function ConsultantAnalysisCard({
  analysis,
  proposals,
  onApprove,
  onViewDetails,
  isApproving
}: ConsultantAnalysisCardProps) {
  const recommendedProposal = proposals.find(p => p.supplierName === analysis.negotiationStrategy.primaryChoice);

  if (!recommendedProposal) return null;

  const hasWarnings = analysis.riskWarnings.length > 0;

  return (
    <Card className="border-primary bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          Recomendação do Consultor IA
          <Badge variant="secondary" className="ml-auto">
            Análise Completa
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Proposta Recomendada */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-green-600 text-white">
                ✅ Proposta Recomendada
              </Badge>
              <span className="font-semibold text-lg">{recommendedProposal.supplierName}</span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <span>💰 R$ {recommendedProposal.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <span>🚚 {recommendedProposal.deliveryTime} dias</span>
              <span>🛡️ {recommendedProposal.warrantyMonths} meses garantia</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            {onApprove && (
              <Button
                onClick={() => onApprove(recommendedProposal.id)}
                disabled={isApproving}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isApproving ? 'Aprovando...' : 'Aprovar'}
              </Button>
            )}
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewDetails}
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver Análise Completa
              </Button>
            )}
          </div>
        </div>

        {/* Parecer do Consultor */}
        <div className="bg-background rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-2">
            <div className="text-sm font-medium">🎯 Parecer do Consultor:</div>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {analysis.executiveSummary}
          </p>
        </div>

        {/* Principais Motivos */}
        {analysis.bestOverall.reasons.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Por que esta proposta?
            </div>
            <ul className="space-y-1 ml-6">
              {analysis.bestOverall.reasons.slice(0, 3).map((reason, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-600">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Alertas */}
        {hasWarnings && (
          <div className="bg-amber-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              Pontos de Atenção
            </div>
            <ul className="space-y-1 ml-6">
              {analysis.riskWarnings.slice(0, 2).map((warning, idx) => (
                <li key={idx} className="text-sm text-amber-700 flex items-start gap-2">
                  <span>•</span>
                  <span>{warning.warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Estratégia de Negociação */}
        {analysis.negotiationStrategy.negotiationPoints.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
              💡 Estratégia de Negociação
            </div>
            <ul className="space-y-1 ml-6">
              {analysis.negotiationStrategy.negotiationPoints.slice(0, 2).map((point, idx) => (
                <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                  <span>•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            {analysis.negotiationStrategy.expectedDiscount && (
              <p className="text-xs text-blue-600 ml-6 mt-2">
                Desconto esperado: {analysis.negotiationStrategy.expectedDiscount}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
