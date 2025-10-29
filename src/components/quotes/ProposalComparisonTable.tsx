import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { QuoteProposal } from './QuoteDetailModal';
import { Package, Clock, Shield, FileText } from 'lucide-react';

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

  const isSingleProposal = proposals.length === 1;
  const proposal = proposals[0];

  // Layout para proposta única
  if (isSingleProposal) {
    // 💰 Calcular total normalizado a partir dos itens
    const itemsSubtotal = proposal.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const computedTotal = itemsSubtotal + proposal.shippingCost;
    const displayTotal = Math.abs(proposal.totalPrice - computedTotal) > 0.01 ? computedTotal : proposal.totalPrice;

    console.log('💰 [COMPARISON-SINGLE]', {
      supplier: proposal.supplierName,
      itemsSubtotal,
      shippingCost: proposal.shippingCost,
      computedTotal,
      proposalTotalPrice: proposal.totalPrice,
      displayTotal
    });

    return (
      <div className="space-y-6">
        {/* Cabeçalho do Fornecedor */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-foreground">{proposal.supplierName}</h3>
              <div className="flex items-center gap-2 mt-2">
                {proposal.reputation > 0 && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    ⭐ Reputação: {proposal.reputation.toFixed(1)}
                  </Badge>
                )}
              </div>
            </div>
            <Badge className="text-base px-4 py-2">
              R$ {displayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Badge>
          </div>

          {/* Informações Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Prazo:</span>
              <span className="font-semibold text-foreground">{proposal.deliveryTime} dias</span>
            </div>
            {proposal.warrantyMonths && (
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Garantia:</span>
                <span className="font-semibold text-foreground">{proposal.warrantyMonths} meses</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Itens:</span>
              <span className="font-semibold text-foreground">{proposal.items.length}</span>
            </div>
          </div>
        </Card>

        {/* Tabela de Itens Detalhada */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted/50">
                  <th className="text-left p-3 font-semibold">Produto</th>
                  <th className="text-center p-3 font-semibold">Quantidade</th>
                  <th className="text-right p-3 font-semibold">Preço Unitário</th>
                  <th className="text-right p-3 font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {quoteItems.map((item, idx) => {
                  const proposalItem = proposal.items.find(pi => 
                    pi.productId === item.product_name || pi.productName === item.product_name
                  );
                  const unitPrice = proposalItem?.unitPrice || 0;
                  const subtotal = unitPrice * item.quantity;
                  
                  return (
                    <tr key={item.id} className={`border-b border-border ${idx % 2 === 0 ? 'bg-muted/20' : ''}`}>
                      <td className="p-3">
                        <p className="font-medium text-foreground">{item.product_name}</p>
                      </td>
                      <td className="text-center p-3 text-muted-foreground">
                        {item.quantity}
                      </td>
                      <td className="text-right p-3 font-medium text-foreground">
                        {unitPrice > 0 ? (
                          `R$ ${unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-right p-3 font-semibold text-foreground">
                        {unitPrice > 0 ? (
                          `R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                
                {/* Linha de Frete */}
                <tr className="border-b border-border bg-blue-50/30">
                  <td colSpan={3} className="p-3 font-medium text-foreground">Frete</td>
                  <td className="text-right p-3 font-semibold text-foreground">
                    {proposal.shippingCost === 0 ? (
                      <span className="text-green-600">Grátis</span>
                    ) : (
                      `R$ ${proposal.shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    )}
                  </td>
                </tr>
                
                {/* Linha de Total */}
                <tr className="font-bold bg-muted border-t-2 border-border">
                  <td colSpan={3} className="p-3 text-base text-foreground">VALOR TOTAL</td>
                  <td className="text-right p-3 text-lg text-primary">
                    R$ {displayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Observações do Fornecedor */}
        {proposal.observations && (
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-2">Observações do Fornecedor</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{proposal.observations}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Layout para múltiplas propostas (comparação)
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
              const proposalItem = p.items.find(pi => 
                pi.productId === item.product_name || pi.productName === item.product_name
              );
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
                  const proposalItem = p.items.find(pi => 
                    pi.productId === item.product_name || pi.productName === item.product_name
                  );
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
                {p.shippingCost === 0 ? (
                  <span className="text-green-600">Grátis</span>
                ) : (
                  `R$ ${p.shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                )}
              </td>
            ))}
          </tr>
          
          {/* Total row */}
          <tr className="font-bold bg-muted border-t-2 border-border">
            <td className="p-3 text-base">VALOR TOTAL</td>
            {proposals.map(p => {
              // 💰 Calcular total normalizado
              const itemsSubtotal = p.items.reduce((sum, item) => sum + (item.total || 0), 0);
              const computedTotal = itemsSubtotal + p.shippingCost;
              const displayTotal = Math.abs(p.totalPrice - computedTotal) > 0.01 ? computedTotal : p.totalPrice;
              
              const allDisplayTotals = proposals.map(pr => {
                const iSum = pr.items.reduce((sum, item) => sum + (item.total || 0), 0);
                const cTotal = iSum + pr.shippingCost;
                return Math.abs(pr.totalPrice - cTotal) > 0.01 ? cTotal : pr.totalPrice;
              });
              const minTotal = Math.min(...allDisplayTotals);
              const isBestTotal = displayTotal === minTotal;

              console.log('💰 [COMPARISON-MULTI]', {
                supplier: p.supplierName,
                itemsSubtotal,
                shippingCost: p.shippingCost,
                computedTotal,
                proposalTotalPrice: p.totalPrice,
                displayTotal,
                isBestTotal
              });
              
              return (
                <td key={p.id} className={`text-center p-3 text-base ${isBestTotal ? 'bg-green-100' : ''}`}>
                  <p className={isBestTotal ? 'text-green-600' : ''}>
                    R$ {displayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
        </tbody>
      </table>
    </div>
  );
}
