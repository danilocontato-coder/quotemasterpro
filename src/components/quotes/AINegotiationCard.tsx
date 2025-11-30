import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAINegotiation, type AINegotiation } from '@/hooks/useAINegotiation';
import { Brain, TrendingDown, MessageSquare, Check, X, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { NegotiationLogModal } from './NegotiationLogModal';

interface AINegotiationCardProps {
  negotiation: AINegotiation;
  onStartNegotiation?: (id: string) => Promise<void>;
  onApproveNegotiation?: (id: string) => Promise<void>;
  onRejectNegotiation?: (id: string) => Promise<void>;
  onStartAnalysis?: (quoteId: string) => Promise<void>;
}

const statusConfig = {
  analyzing: { label: 'Analisando', color: 'bg-blue-500', icon: Brain },
  analyzed: { label: 'Analisada', color: 'bg-green-500', icon: Check },
  not_viable: { label: 'Não Viável', color: 'bg-gray-500', icon: X },
  negotiating: { label: 'Negociando via WhatsApp', color: 'bg-yellow-500', icon: MessageSquare },
  completed: { label: 'Concluída', color: 'bg-green-500', icon: Check },
  failed: { label: 'Falhou', color: 'bg-red-500', icon: X },
  approved: { label: 'Aprovada', color: 'bg-emerald-500', icon: Check },
  rejected: { label: 'Rejeitada', color: 'bg-gray-500', icon: X }
};

export function AINegotiationCard({ 
  negotiation, 
  onStartNegotiation,
  onApproveNegotiation,
  onRejectNegotiation,
  onStartAnalysis
}: AINegotiationCardProps) {
  const [showLogModal, setShowLogModal] = useState(false);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  
  const config = statusConfig[negotiation.status];
  const IconComponent = config.icon;

  const handleStartNegotiation = async () => {
    console.log('🔵 [Card] ========== INÍCIO handleStartNegotiation ==========');
    console.log('🔵 [Card] negotiation.id:', negotiation.id);
    console.log('🔵 [Card] negotiation.status:', negotiation.status);
    console.log('🔵 [Card] onStartNegotiation disponível:', !!onStartNegotiation);
    
    if (!negotiation.id) {
      console.error('❌ [Card] negotiation.id está undefined!');
      console.error('❌ [Card] Objeto negotiation completo:', JSON.stringify(negotiation, null, 2));
      return;
    }
    
    if (!onStartNegotiation) {
      console.error('❌ [Card] onStartNegotiation callback não foi fornecido!');
      return;
    }

    setIsNegotiating(true);
    try {
      console.log('🔵 [Card] Chamando onStartNegotiation com ID:', negotiation.id);
      await onStartNegotiation(negotiation.id);
      console.log('✅ [Card] onStartNegotiation executado com sucesso');
    } catch (error: any) {
      console.error('❌ [Card] Erro ao chamar onStartNegotiation:', error);
      console.error('❌ [Card] Mensagem do erro:', error?.message);
    } finally {
      setIsNegotiating(false);
      console.log('🔵 [Card] ========== FIM handleStartNegotiation ==========');
    }
  };

  const handleStartAnalysis = async () => {
    if (onStartAnalysis) {
      await onStartAnalysis(negotiation.quote_id);
    }
  };

  const handleApprove = async () => {
    if (onApproveNegotiation) {
      setIsApproving(true);
      try {
        await onApproveNegotiation(negotiation.id);
      } finally {
        setIsApproving(false);
      }
    }
  };

  const handleReject = async () => {
    if (onRejectNegotiation) {
      setIsRejecting(true);
      try {
        await onRejectNegotiation(negotiation.id);
      } finally {
        setIsRejecting(false);
      }
    }
  };

  const savings = negotiation.negotiated_amount 
    ? negotiation.original_amount - negotiation.negotiated_amount
    : (negotiation.ai_analysis?.potentialSavings || 0);

  const discountPercentage = negotiation.discount_percentage ||
    (negotiation.ai_analysis?.negotiationStrategy?.targetDiscount || 0);

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Negociação IA
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Cotação #{negotiation.quote_id}
            </p>
          </div>
          <Badge className={`${config.color} text-white`}>
            <IconComponent className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Análise da IA */}
        {negotiation.ai_analysis && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Análise da IA
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              {negotiation.ai_analysis.analysisReason}
            </p>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Valor Original:</span>
                <p className="text-muted-foreground">
                  {formatCurrency(negotiation.original_amount)}
                </p>
              </div>
              <div>
                <span className="font-medium">Economia Prevista:</span>
                <p className="text-green-600 font-medium flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {formatCurrency(savings)} ({discountPercentage.toFixed(1)}%)
                </p>
              </div>
            </div>

            {negotiation.ai_analysis.negotiationStrategy && (
              <div className="mt-3">
                <span className="font-medium text-sm">Estratégia:</span>
                <p className="text-xs text-muted-foreground">
                  {negotiation.ai_analysis.negotiationStrategy.approach}
                </p>
                {negotiation.ai_analysis.negotiationStrategy.talking_points && (
                  <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside">
                    {negotiation.ai_analysis.negotiationStrategy.talking_points.map((point: string, index: number) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Log de Conversa */}
        {negotiation.conversation_log && negotiation.conversation_log.length > 0 && (
          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversa com Fornecedor
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {negotiation.conversation_log.map((message: any, index: number) => (
                <div key={index} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={message.type === 'ai_message' ? 'default' : 'secondary'} className="text-xs">
                      {message.type === 'ai_message' ? 'IA' : 'Fornecedor'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs bg-background p-2 rounded border">
                    {message.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Valor Negociado */}
        {negotiation.negotiated_amount && (
          <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-lg">
            <div>
              <span className="text-sm font-medium text-green-800">Valor Negociado:</span>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(negotiation.negotiated_amount)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm text-green-700">Economia:</span>
              <p className="text-sm font-medium text-green-600">
                {formatCurrency(savings)}
              </p>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2 pt-2">
          {/* Botão Ver Log - sempre disponível se houver conversa */}
          {negotiation.conversation_log && negotiation.conversation_log.length > 0 && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowLogModal(true)}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Ver Log Completo
            </Button>
          )}
          {negotiation.status === 'analyzing' && onStartAnalysis && (
            <Button 
              size="sm"
              onClick={handleStartAnalysis}
              className="flex-1"
            >
              <Brain className="h-4 w-4 mr-2" />
              Executar análise agora
            </Button>
          )}

          {negotiation.status === 'analyzed' && (
            <>
              <Button 
                size="sm" 
                onClick={handleStartNegotiation}
                disabled={!negotiation.id || isNegotiating}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isNegotiating ? (
                  <>
                    <Brain className="h-4 w-4 mr-2 animate-spin" />
                    Enviando WhatsApp...
                  </>
                ) : !negotiation.id ? (
                  <>
                    <Brain className="h-4 w-4 mr-2 animate-pulse" />
                    Processando...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Negociar via WhatsApp
                  </>
                )}
              </Button>
            </>
          )}
          
          {negotiation.status === 'negotiating' && (
            <div className="flex gap-2 w-full">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
                className="flex-1"
              >
                {isApproving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {isApproving ? 'Aprovando...' : 'Aprovar'}
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={handleReject}
                disabled={isApproving || isRejecting}
                className="flex-1"
              >
                {isRejecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                {isRejecting ? 'Rejeitando...' : 'Rejeitar'}
              </Button>
            </div>
          )}

          {negotiation.status === 'approved' && (
            <Badge className="bg-emerald-500 text-white w-full justify-center">
              <Check className="h-3 w-3 mr-1" />
              Negociação Aprovada
            </Badge>
          )}

          {negotiation.status === 'rejected' && (
            <Badge variant="secondary" className="w-full justify-center">
              <X className="h-3 w-3 mr-1" />
              Negociação Rejeitada
            </Badge>
          )}
        </div>

        {/* Modal do Log */}
        <NegotiationLogModal 
          open={showLogModal}
          onClose={() => setShowLogModal(false)}
          negotiation={negotiation}
        />
      </CardContent>
    </Card>
  );
}