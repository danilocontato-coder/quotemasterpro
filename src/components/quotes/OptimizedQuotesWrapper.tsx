import React, { memo } from 'react';
import { useSupabaseQuotes } from '@/hooks/useSupabaseQuotes';
import { useSupabaseSubscriptionGuard } from '@/hooks/useSupabaseSubscriptionGuard';

interface OptimizedQuotesWrapperProps {
  children: (props: {
    quotes: any[];
    createQuote: any;
    updateQuote: any;
    deleteQuote: any;
    isLoading: boolean;
    error: string | null;
    markQuoteAsReceived: any;
    refetch: any;
    enforceLimit: any;
  }) => React.ReactNode;
}

// Memoized wrapper to prevent unnecessary re-renders
export const OptimizedQuotesWrapper = memo(({ children }: OptimizedQuotesWrapperProps) => {
  const quotesData = useSupabaseQuotes();
  const { enforceLimit } = useSupabaseSubscriptionGuard();

  console.log('🔄 OptimizedQuotesWrapper rendered - preventing excessive re-renders');

  return (
    <>
      {children({
        ...quotesData,
        enforceLimit,
      })}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders unless children actually change
  return prevProps.children === nextProps.children;
});

OptimizedQuotesWrapper.displayName = 'OptimizedQuotesWrapper';