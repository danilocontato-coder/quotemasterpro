import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { QuoteComparison, QuoteProposal } from './QuoteComparison';

interface QuoteComparisonButtonProps {
  quoteId: string;
  quoteTitle: string;
  disabled?: boolean;
}

// Mock proposals for demonstration
const mockProposals: QuoteProposal[] = [
  {
    id: '1',
    quoteId: 'RFQ009',
    supplierId: '1',
    supplierName: 'Materiais Santos Ltda',
    price: 15750.00,
    deliveryTime: 7,
    shippingCost: 450.00,
    sla: 24,
    warrantyMonths: 12,
    reputation: 4.5,
    observations: 'Proposta completa com desconto por volume',
    submittedAt: '2025-08-19T10:30:00Z',
  },
  {
    id: '2',
    quoteId: 'RFQ009',
    supplierId: '3',
    supplierName: 'Elétrica Silva & Cia',
    price: 14200.00,
    deliveryTime: 10,
    shippingCost: 380.00,
    sla: 48,
    warrantyMonths: 18,
    reputation: 4.8,
    observations: 'Melhor garantia do mercado, prazo flexível',
    submittedAt: '2025-08-19T14:15:00Z',
  },
  {
    id: '3',
    quoteId: 'RFQ009',
    supplierId: '5',
    supplierName: 'Hidráulica Rápida',
    price: 16800.00,
    deliveryTime: 5,
    shippingCost: 320.00,
    sla: 12,
    warrantyMonths: 24,
    reputation: 4.2,
    observations: 'Entrega expressa, instalação incluída',
    submittedAt: '2025-08-19T16:45:00Z',
  },
];

export function QuoteComparisonButton({ 
  quoteId, 
  quoteTitle, 
  disabled = false 
}: QuoteComparisonButtonProps) {
  const [showComparison, setShowComparison] = useState(false);

  // In a real app, you would fetch proposals for this quote
  const proposals = mockProposals.filter(p => p.quoteId === quoteId);
  const hasProposals = proposals.length >= 2;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowComparison(true)}
        disabled={disabled || !hasProposals}
        className="flex items-center gap-2"
      >
        <BarChart3 className="h-4 w-4" />
        Comparar ({proposals.length})
      </Button>

      <QuoteComparison
        open={showComparison}
        onClose={() => setShowComparison(false)}
        proposals={proposals}
        quoteTitle={quoteTitle}
      />
    </>
  );
}