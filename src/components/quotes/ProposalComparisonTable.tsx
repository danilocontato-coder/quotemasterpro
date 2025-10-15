import React from 'react';
import { Badge } from '@/components/ui/badge';
import { QuoteProposal } from './QuoteDetailModal';
import { getProposalScore } from './ProposalRecommendationBadge';

interface QuoteItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price?: number;
  total?: number;
}

interface ProposalComparisonTableProps {
  proposals: QuoteProposal[];
  quoteItems: QuoteItem[];
}

export function ProposalComparisonTable({ proposals, quoteItems }: ProposalComparisonTableProps) {
  if (proposals.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Nenhuma proposta para comparar
      </p>
    );
  }

  // Calcular scores
  const proposalsWithScores = proposals.map(p => ({
    ...p,
    score: getProposalScore(p, proposals)
  }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-border">
            <th className="text-left p-3 font-semibold bg-muted/50">Item</th>
            {proposals.map(p => (
              <th key={p.id} className="text-center p-3 font-semibold bg-muted/50 min-w-[140px]">
                {p.supplierName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {quoteItems.map((item, idx) => {
            const prices = proposals.map(p => {
              const proposalItem = p.items.find(pi => pi.productId === item.id);
              return proposalItem?.unitPrice || 0;
            });
            const minPrice = Math.min(...prices.filter(p => p > 0));
            
            return (
              <tr key={item.id} className={`border-b border-border ${idx % 2 === 0 ? 'bg-muted/20' : ''}`}>
                <td className="p-3">
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Quantidade: {item.quantity}</p>
                </td>
                {proposals.map((p) => {
                  const proposalItem = p.items.find(pi => pi.productId === item.id);
                  const price = proposalItem?.unitPrice || 0;
                  const isBest = price === minPrice && price > 0 && minPrice < Infinity;
                  
                  return (
                    <td key={p.id} className={`text-center p-3 ${isBest ? 'bg-green-50' : ''}`}>
                      {price > 0 ? (
                        <>
                          <p className={`font-bold ${isBest ? 'text-green-600' : ''}`}>
                            R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Total: R$ {(price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {isBest && (
                            <Badge variant="default" className="text-xs mt-1 bg-green-600">
                              ⭐ Melhor
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          
          {/* Shipping costs */}
          <tr className="border-b border-border bg-blue-50/30">
            <td className="p-3 font-medium">Frete</td>
            {proposals.map(p => (
              <td key={p.id} className="text-center p-3 font-medium">
                R$ {p.shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            ))}
          </tr>
          
          {/* Total row */}
          <tr className="font-bold bg-muted border-t-2 border-border">
            <td className="p-3 text-base">VALOR TOTAL</td>
            {proposals.map(p => {
              const allPrices = proposals.map(pr => pr.totalPrice);
              const minTotal = Math.min(...allPrices);
              const isBestTotal = p.totalPrice === minTotal;
              
              return (
                <td key={p.id} className={`text-center p-3 text-base ${isBestTotal ? 'bg-green-100' : ''}`}>
                  <p className={isBestTotal ? 'text-green-600' : ''}>
                    R$ {p.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  {isBestTotal && (
                    <Badge variant="default" className="text-xs mt-1 bg-green-600">
                      ⭐ Menor Preço
                    </Badge>
                  )}
                </td>
              );
            })}
          </tr>
          
          {/* Delivery time row */}
          <tr className="border-t border-border">
            <td className="p-3 font-medium">Prazo de Entrega</td>
            {proposals.map(p => {
              const allTimes = proposals.map(pr => pr.deliveryTime);
              const minTime = Math.min(...allTimes);
              const isFastest = p.deliveryTime === minTime;
              
              return (
                <td key={p.id} className={`text-center p-3 ${isFastest ? 'bg-blue-50' : ''}`}>
                  <p className={`font-medium ${isFastest ? 'text-blue-600' : ''}`}>
                    {p.deliveryTime} dias
                  </p>
                  {isFastest && (
                    <Badge variant="secondary" className="text-xs mt-1 bg-blue-100 text-blue-700">
                      🚀 Mais Rápido
                    </Badge>
                  )}
                </td>
              );
            })}
          </tr>
          
          {/* Score row */}
          <tr className="border-t-2 border-border bg-amber-50/30">
            <td className="p-3 font-bold">Score Geral (Custo-Benefício)</td>
            {proposalsWithScores.map(p => {
              const maxScore = Math.max(...proposalsWithScores.map(pr => pr.score));
              const isBest = p.score === maxScore;
              
              return (
                <td key={p.id} className={`text-center p-3 ${isBest ? 'bg-amber-100' : ''}`}>
                  <p className={`font-bold text-lg ${isBest ? 'text-amber-600' : ''}`}>
                    {p.score}
                  </p>
                  {isBest && (
                    <Badge className="text-xs mt-1 bg-amber-600 text-white">
                      🏆 Melhor Custo-Benefício
                    </Badge>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
