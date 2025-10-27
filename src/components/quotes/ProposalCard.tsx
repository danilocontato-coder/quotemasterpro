import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Brain, ChevronDown, ChevronUp, DollarSign, Clock, Shield, Star, Package, TrendingUp } from 'lucide-react';
import { QuoteProposal, QuoteItem } from './QuoteDetailModal';
import { ProposalRadarChart } from './ProposalRadarChart';

interface ProposalCardProps {
  proposal: QuoteProposal;
  rank: number;
  score: number;
  isWinner: boolean;
  quoteItems: QuoteItem[];
  isQuoteLocked: boolean;
  onApprove?: () => void;
  onNegotiate?: () => void;
  canNegotiate: boolean;
  negotiationAttempts: number;
  allProposals: QuoteProposal[];
}

export const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  rank,
  score,
  isWinner,
  quoteItems,
  isQuoteLocked,
  onApprove,
  onNegotiate,
  canNegotiate,
  negotiationAttempts,
  allProposals
}) => {
  const [isExpanded, setIsExpanded] = useState(isWinner);

  const getMedalEmoji = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}º`;
    }
  };

  // Calcular totais usando os preços da proposta (proposal.items) ao invés de quoteItems
  // porque quoteItems pode ter unit_price/total nulos
  const itemsWithPrices = quoteItems.map(item => {
    const proposalItem = proposal.items.find(pi => pi.productId === item.id);
    const unitPrice = proposalItem?.unitPrice ?? 0;
    const subtotal = unitPrice * item.quantity;
    return { ...item, unitPrice, subtotal };
  });
  
  const itemsSubtotal = itemsWithPrices.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingCost = proposal.shippingCost || 0;

  return (
    <Card className={`transition-all duration-300 ease-in-out ${isWinner ? 'border-2 border-green-500 shadow-lg' : ''}`}>
      <CardContent className="p-4">
        {/* Compact View Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-2xl">{getMedalEmoji(rank)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-base">{proposal.supplierName}</span>
                {isWinner && (
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    Melhor Escolha
                  </Badge>
                )}
              </div>
              
              {/* Compact Metrics - Always visible */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  R$ {proposal.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {proposal.deliveryTime}d
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {proposal.warrantyMonths}m
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {proposal.reputation}/5
                </span>
              </div>
            </div>
          </div>
          
          {/* Score Badge */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {score.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">pontos</div>
            </div>
          </div>
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="animate-fade-in mt-6 space-y-4 border-t pt-4">
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold">{proposal.supplierName}</h3>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{score.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">SCORE TOTAL</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                <span className="font-medium">Reputação: {proposal.reputation}/5</span>
              </div>
            </div>

            {/* Quick Facts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-xs text-muted-foreground">Prazo de Entrega</div>
                  <div className="font-semibold">{proposal.deliveryTime} dias</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="text-xs text-muted-foreground">Garantia</div>
                  <div className="font-semibold">{proposal.warrantyMonths} meses</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-xs text-muted-foreground">Itens</div>
                  <div className="font-semibold">{quoteItems.length}</div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <h4 className="font-semibold text-sm">Itens da Proposta</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Produto</th>
                      <th className="text-center text-xs font-medium text-muted-foreground p-3">Quantidade</th>
                      <th className="text-right text-xs font-medium text-muted-foreground p-3">Preço Unitário</th>
                      <th className="text-right text-xs font-medium text-muted-foreground p-3">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsWithPrices.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3 text-sm">{item.product_name}</td>
                        <td className="p-3 text-sm text-center">{item.quantity}</td>
                        <td className="p-3 text-sm text-right">
                          {item.unitPrice > 0 ? (
                            `R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-right font-medium">
                          {item.subtotal > 0 ? (
                            `R$ ${item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Subtotal */}
                    <tr className="border-t bg-muted/30">
                      <td colSpan={3} className="p-3 text-sm font-medium text-right">Subtotal dos Itens:</td>
                      <td className="p-3 text-sm text-right font-semibold">
                        R$ {itemsSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    
                    {/* Shipping */}
                    <tr className="border-t">
                      <td colSpan={3} className="p-3 text-sm font-medium text-right flex items-center justify-end gap-2">
                        <Package className="h-4 w-4" />
                        Frete:
                      </td>
                      <td className="p-3 text-sm text-right">
                        {shippingCost === 0 ? (
                          <span className="text-green-600 font-medium">Grátis</span>
                        ) : (
                          `R$ ${shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        )}
                      </td>
                    </tr>
                    
                    {/* Total */}
                    <tr className="border-t bg-primary/5">
                      <td colSpan={3} className="p-3 text-base font-bold text-right">VALOR TOTAL:</td>
                      <td className="p-3 text-base text-right font-bold text-primary">
                        R$ {proposal.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Supplier Notes */}
            {proposal.observations && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm mb-1">Observações do Fornecedor</h5>
                    <p className="text-sm text-muted-foreground">{proposal.observations}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Radar Chart */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                📊 Análise Comparativa
              </h4>
              <ProposalRadarChart 
                proposal={proposal} 
                allProposals={allProposals}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isQuoteLocked}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4" />
            {isQuoteLocked ? 'Proposta Já Selecionada' : (isWinner ? 'Aprovar Melhor Proposta' : 'Aprovar Proposta')}
          </Button>
          
          {canNegotiate && (
            <Button
              size="sm"
              onClick={onNegotiate}
              variant="outline"
              className="flex items-center gap-2 text-blue-600 border-blue-300"
            >
              <Brain className="h-4 w-4" />
              Negociar com IA
            </Button>
          )}
          
          {negotiationAttempts >= 2 && (
            <Badge variant="secondary" className="text-xs">
              Limite de negociações atingido
            </Badge>
          )}

          {/* Toggle Expand Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 ml-auto"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Recolher Detalhes
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Ver Detalhes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
