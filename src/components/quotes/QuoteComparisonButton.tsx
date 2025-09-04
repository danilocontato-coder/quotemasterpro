import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { QuoteComparison, QuoteProposal } from './QuoteComparison';
import { supabase } from '@/integrations/supabase/client';

interface QuoteComparisonButtonProps {
  quoteId: string;
  quoteTitle: string;
  disabled?: boolean;
  responsesCount?: number;
}

export function QuoteComparisonButton({ 
  quoteId, 
  quoteTitle, 
  disabled = false,
  responsesCount = 0
}: QuoteComparisonButtonProps) {
  const [showComparison, setShowComparison] = useState(false);
  const [proposals, setProposals] = useState<QuoteProposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real proposals from Supabase
  const fetchProposals = async () => {
    if (!quoteId) return;
    
    setIsLoading(true);
    try {
      const { data: responses, error } = await supabase
        .from('quote_responses')
        .select(`
          *,
          suppliers!inner(name, cnpj, email, phone)
        `)
        .eq('quote_id', quoteId)
        .eq('status', 'sent');

      if (error) {
        console.error('Error fetching proposals:', error);
        return;
      }

      const transformedProposals: QuoteProposal[] = (responses || []).map(response => ({
        id: response.id,
        quoteId: response.quote_id,
        supplierId: response.supplier_id,
        supplierName: response.suppliers.name,
        price: response.total_amount,
        deliveryTime: response.delivery_time || 7,
        shippingCost: 0, // Default shipping cost
        sla: 24, // Default SLA in hours
        warrantyMonths: 12, // Default warranty
        reputation: 4.5, // Default rating
        observations: response.notes || '',
        submittedAt: response.created_at
      }));

      setProposals(transformedProposals);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (responsesCount > 0) {
      fetchProposals();
    }
  }, [quoteId, responsesCount]);

  const hasProposals = proposals.length >= 1; // Show comparison with at least 1 proposal

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowComparison(true)}
        disabled={disabled || !hasProposals || isLoading}
        className="flex items-center gap-2"
        title={hasProposals ? 'Comparar propostas' : 'Aguardando propostas'}
      >
        <BarChart3 className="h-4 w-4" />
        {isLoading ? 'Carregando...' : `Comparar (${proposals.length})`}
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