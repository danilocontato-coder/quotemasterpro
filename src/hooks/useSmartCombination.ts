import { useMemo } from 'react';
import { QuoteProposal, ProposalItem } from '@/components/quotes/QuoteDetailModal';

export interface SmartCombinationItem {
  itemId: string;
  itemName: string;
  bestSupplierId: string;
  bestSupplierName: string;
  bestPrice: number;
  quantity: number;
  totalItemCost: number;
  savings: number;
  savingsPercentage: number;
  otherOptions: Array<{
    supplierId: string;
    supplierName: string;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface SmartCombinationResult {
  items: SmartCombinationItem[];
  totalCost: number;
  totalSavings: number;
  savingsPercentage: number;
  uniqueSuppliers: string[];
  isMultiSupplier: boolean;
  supplierBreakdown: Array<{
    supplierId: string;
    supplierName: string;
    itemCount: number;
    totalCost: number;
    items: SmartCombinationItem[];
  }>;
}

/**
 * Hook para calcular combinação inteligente de melhores preços
 * 
 * IMPORTANTE: Esta é uma função PURAMENTE LOCAL que NÃO consome tokens de IA.
 * Ela apenas analisa as propostas existentes e identifica o menor preço por item.
 */
export function useSmartCombination() {
  const calculateBestCombination = (proposals: QuoteProposal[]): SmartCombinationResult | null => {
    if (!proposals || proposals.length === 0) {
      return null;
    }

    // 1. Criar mapa de itens com todas as ofertas
    const itemsMap = new Map<string, Array<{
      supplierId: string;
      supplierName: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
    }>>();

    // Coletar todas as ofertas por item
    proposals.forEach(proposal => {
      proposal.items.forEach(item => {
        const key = item.productName;
        if (!itemsMap.has(key)) {
          itemsMap.set(key, []);
        }
        itemsMap.get(key)!.push({
          supplierId: proposal.supplierId,
          supplierName: proposal.supplierName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          totalPrice: item.total
        });
      });
    });

    // 2. Para cada item, encontrar menor preço
    const bestItems: SmartCombinationItem[] = [];
    let totalCost = 0;
    let totalOriginalCost = 0;

    itemsMap.forEach((offers, itemName) => {
      // Ordenar por preço unitário (menor primeiro)
      const sortedOffers = [...offers].sort((a, b) => a.unitPrice - b.unitPrice);
      const bestOffer = sortedOffers[0];
      const worstOffer = sortedOffers[sortedOffers.length - 1];

      const itemSavings = worstOffer.totalPrice - bestOffer.totalPrice;
      const itemSavingsPercentage = worstOffer.unitPrice > 0 
        ? ((worstOffer.unitPrice - bestOffer.unitPrice) / worstOffer.unitPrice) * 100 
        : 0;

      bestItems.push({
        itemId: itemName,
        itemName,
        bestSupplierId: bestOffer.supplierId,
        bestSupplierName: bestOffer.supplierName,
        bestPrice: bestOffer.unitPrice,
        quantity: bestOffer.quantity,
        totalItemCost: bestOffer.totalPrice,
        savings: itemSavings,
        savingsPercentage: itemSavingsPercentage,
        otherOptions: sortedOffers.slice(1).map(offer => ({
          supplierId: offer.supplierId,
          supplierName: offer.supplierName,
          unitPrice: offer.unitPrice,
          totalPrice: offer.totalPrice
        }))
      });

      totalCost += bestOffer.totalPrice;
      totalOriginalCost += worstOffer.totalPrice;
    });

    // 3. Calcular economia total
    const totalSavings = totalOriginalCost - totalCost;
    const savingsPercentage = totalOriginalCost > 0 
      ? (totalSavings / totalOriginalCost) * 100 
      : 0;

    // 4. Identificar fornecedores únicos
    const uniqueSupplierIds = [...new Set(bestItems.map(item => item.bestSupplierId))];
    const isMultiSupplier = uniqueSupplierIds.length > 1;

    // 5. Criar breakdown por fornecedor
    const supplierBreakdown = uniqueSupplierIds.map(supplierId => {
      const supplierItems = bestItems.filter(item => item.bestSupplierId === supplierId);
      const supplierTotalCost = supplierItems.reduce((sum, item) => sum + item.totalItemCost, 0);
      const supplierName = supplierItems[0].bestSupplierName;

      return {
        supplierId,
        supplierName,
        itemCount: supplierItems.length,
        totalCost: supplierTotalCost,
        items: supplierItems
      };
    });

    return {
      items: bestItems,
      totalCost,
      totalSavings,
      savingsPercentage,
      uniqueSuppliers: uniqueSupplierIds,
      isMultiSupplier,
      supplierBreakdown
    };
  };

  return {
    calculateBestCombination
  };
}
