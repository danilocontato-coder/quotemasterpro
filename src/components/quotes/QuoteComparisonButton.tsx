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

  // Debug: Fetch real proposals from Supabase with extensive logging
  const fetchProposals = async () => {
    if (!quoteId) return;
    
    setIsLoading(true);
    console.log('🔍 DEEP DEBUG - Starting fetch for quote:', quoteId);
    
    try {
      // First, let's check what user we are
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('🔍 DEEP DEBUG - Current user:', user?.id, user?.user_metadata?.role);
      
      // Check user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      console.log('🔍 DEEP DEBUG - User profile:', profile, 'error:', profileError);

      // Check if quote exists and current user can see it
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();
      console.log('🔍 DEEP DEBUG - Quote data:', quote, 'error:', quoteError);

      // Try simple query first (without joins)
      const { data: simpleResponses, error: simpleError } = await supabase
        .from('quote_responses')
        .select('*')
        .eq('quote_id', quoteId);
      console.log('🔍 DEEP DEBUG - Simple responses query:', simpleResponses, 'error:', simpleError);

      // Try with direct query only (no join to avoid RLS on suppliers)
      const { data: responses, error } = await supabase
        .from('quote_responses')
        .select('*')
        .eq('quote_id', quoteId);

      console.log('🔍 DEEP DEBUG - Final responses (no join):', responses, 'error:', error);

      if (error) {
        console.error('❌ DEEP DEBUG - Error in final query:', error);
        return;
      }

      const transformedProposals: QuoteProposal[] = (responses || []).map(response => ({
        id: response.id,
        quoteId: response.quote_id,
        supplierId: response.supplier_id,
        supplierName: response.supplier_name,
        price: response.total_amount,
        deliveryTime: response.delivery_time || 7,
        shippingCost: 0,
        sla: 24,
        warrantyMonths: 12,
        reputation: 4.5,
        observations: response.notes || '',
        submittedAt: response.created_at
      }));

      console.log('🔍 DEEP DEBUG - Transformed proposals:', transformedProposals);
      setProposals(transformedProposals);
    } catch (error) {
      console.error('❌ DEEP DEBUG - Catch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔍 QuoteComparisonButton - useEffect triggered:', { 
      quoteId, 
      responsesCount, 
      shouldFetch: quoteId && quoteId.length > 0 
    });
    if (quoteId && quoteId.length > 0) {
      fetchProposals();
    }
  }, [quoteId]);

  const hasProposals = proposals.length >= 1; // Show comparison with at least 1 proposal
  
  console.log('🔍 QuoteComparisonButton - Render state:', { 
    quoteId,
    responsesCount, 
    proposalsLength: proposals.length, 
    hasProposals, 
    disabled,
    isLoading,
    finalDisabled: disabled || !hasProposals || isLoading
  });

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