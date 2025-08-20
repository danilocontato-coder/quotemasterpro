import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { QuoteComparison, QuoteProposal } from './QuoteComparison';
import { mockProposals, mockProposalsAlternative } from '@/data/mockProposals';

interface QuoteComparisonButtonProps {
  quoteId: string;
  quoteTitle: string;
  disabled?: boolean;
}

export function QuoteComparisonButton({ 
  quoteId, 
  quoteTitle, 
  disabled = false 
}: QuoteComparisonButtonProps) {
  const [showComparison, setShowComparison] = useState(false);

  // Get proposals based on quote ID - in real app, fetch from backend
  const getProposalsForQuote = (id: string): QuoteProposal[] => {
    if (id === 'RFQ009') return mockProposals;
    if (id === 'RFQ008') return mockProposalsAlternative;
    return mockProposals; // default fallback
  };

  const proposals = getProposalsForQuote(quoteId);
  const hasProposals = proposals.length >= 2;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowComparison(true)}
        disabled={disabled || !hasProposals}
        className="flex items-center gap-2"
        title={hasProposals ? 'Comparar propostas' : 'Aguardando mais propostas'}
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