import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SupplierDashboardMetrics {
  activeQuotes: number;
  pendingProposals: number;
  monthlyRevenue: number;
  approvalRate: number;
}

export interface RecentSupplierQuote {
  id: string;
  title: string;
  client: string;
  status: string;
  deadline: string;
  estimatedValue: number;
}

export const useSimpleSupplierDashboard = () => {
  const [metrics, setMetrics] = useState<SupplierDashboardMetrics>({
    activeQuotes: 0,
    pendingProposals: 0,
    monthlyRevenue: 0,
    approvalRate: 0,
  });
  const [recentQuotes, setRecentQuotes] = useState<RecentSupplierQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== 'supplier') {
        setIsLoading(false);
        return;
      }

      console.log('🔍 [SIMPLE-SUPPLIER-DASHBOARD] Fetching data for user:', user.email);

      try {
        // Buscar todas as cotações que o fornecedor pode ver
        const { data: quotes, error: quotesError } = await supabase
          .from('quotes')
          .select('*')
          .or(`status.in.(sent,receiving),supplier_scope.in.(global,all)`)
          .order('created_at', { ascending: false })
          .limit(5);

        if (quotesError) {
          console.error('❌ Error fetching quotes:', quotesError);
        } else {
          console.log('✅ Found quotes:', quotes?.length || 0);
          
          // Transform quotes to recent quotes format
          const transformedQuotes: RecentSupplierQuote[] = (quotes || []).map(quote => ({
            id: quote.id,
            title: quote.title,
            client: quote.client_name || 'Cliente não informado',
            status: quote.status,
            deadline: quote.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            estimatedValue: quote.total || 0,
          }));

          setRecentQuotes(transformedQuotes);

          // Calculate simple metrics
          const activeQuotes = quotes?.filter(q => ['sent', 'receiving'].includes(q.status)).length || 0;
          const pendingProposals = quotes?.filter(q => q.status === 'sent').length || 0;

          setMetrics({
            activeQuotes,
            pendingProposals,
            monthlyRevenue: 0, // Will be calculated later
            approvalRate: 0, // Will be calculated later
          });
        }

      } catch (error) {
        console.error('❌ Error in fetchData:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return {
    metrics,
    recentQuotes,
    isLoading,
    refetch: () => {
      setIsLoading(true);
      // Re-trigger the effect
    }
  };
};