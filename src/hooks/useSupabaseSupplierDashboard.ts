import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SupplierDashboardMetrics {
  activeQuotes: number;
  pendingProposals: number;
  monthlyRevenue: number;
  approvalRate: number;
  revenueGrowth: number;
  approvalGrowth: number;
}

export interface RecentSupplierQuote {
  id: string;
  title: string;
  client: string;
  status: 'pending' | 'proposal_sent' | 'approved' | 'rejected' | 'expired';
  deadline: string;
  estimatedValue: number;
}

export const useSupabaseSupplierDashboard = () => {
  const [metrics, setMetrics] = useState<SupplierDashboardMetrics>({
    activeQuotes: 0,
    pendingProposals: 0,
    monthlyRevenue: 0,
    approvalRate: 0,
    revenueGrowth: 0,
    approvalGrowth: 0,
  });
  const [recentQuotes, setRecentQuotes] = useState<RecentSupplierQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    // Early return if user doesn't have supplierId yet  
    if (!user.supplierId) {
      console.log('User does not have supplierId yet, waiting...');
      setIsLoading(false);
      setMetrics({
        activeQuotes: 0,
        pendingProposals: 0,
        monthlyRevenue: 0,
        approvalRate: 0,
        revenueGrowth: 0,
        approvalGrowth: 0,
      });
      setRecentQuotes([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching dashboard data for supplier:', user.supplierId);

      // Fetch active quotes (quotes where supplier has responded or been assigned)
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_responses!inner (
            id,
            supplier_id,
            total_amount,
            status,
            created_at
          )
        `)
        .eq('quote_responses.supplier_id', user.supplierId)
        .in('status', ['sent', 'receiving', 'under_review', 'approved'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (quotesError) throw quotesError;

      // Transform to recent quotes format
      const transformedRecentQuotes: RecentSupplierQuote[] = (quotesData || []).map(quote => {
        const response = quote.quote_responses[0];
        return {
          id: quote.id,
          title: quote.title,
          client: quote.client_name,
          status: getSupplierStatusFromResponse(response.status),
          deadline: quote.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedValue: response.total_amount || quote.total || 0,
        };
      });

      setRecentQuotes(transformedRecentQuotes);

      // Calculate metrics
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      // Active quotes count
      const activeQuotes = quotesData?.length || 0;
      
      // Pending proposals (responses with 'pending' status)
      const pendingProposals = quotesData?.filter(q => 
        q.quote_responses.some((r: any) => r.status === 'pending')
      ).length || 0;

      // Monthly revenue (approved quotes this month)
      const { data: monthlyRevenueData, error: revenueError } = await supabase
        .from('quote_responses')
        .select('total_amount, created_at')
        .eq('supplier_id', user.supplierId)
        .eq('status', 'approved')
        .gte('created_at', new Date(currentYear, currentMonth, 1).toISOString())
        .lt('created_at', new Date(currentYear, currentMonth + 1, 1).toISOString());

      if (revenueError) throw revenueError;

      const monthlyRevenue = monthlyRevenueData?.reduce((sum, response) => 
        sum + (response.total_amount || 0), 0
      ) || 0;

      // Previous month revenue for growth calculation
      const { data: prevMonthRevenueData } = await supabase
        .from('quote_responses')
        .select('total_amount')
        .eq('supplier_id', user.supplierId)
        .eq('status', 'approved')
        .gte('created_at', new Date(currentYear, currentMonth - 1, 1).toISOString())
        .lt('created_at', new Date(currentYear, currentMonth, 1).toISOString());

      const prevMonthRevenue = prevMonthRevenueData?.reduce((sum, response) => 
        sum + (response.total_amount || 0), 0
      ) || 0;

      const revenueGrowth = prevMonthRevenue > 0 
        ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 
        : 0;

      // Approval rate calculation
      const { data: allResponsesData, error: allResponsesError } = await supabase
        .from('quote_responses')
        .select('status')
        .eq('supplier_id', user.supplierId)
        .in('status', ['approved', 'rejected']);

      if (allResponsesError) throw allResponsesError;

      const totalResponses = allResponsesData?.length || 0;
      const approvedResponses = allResponsesData?.filter(r => r.status === 'approved').length || 0;
      const approvalRate = totalResponses > 0 ? (approvedResponses / totalResponses) * 100 : 0;

      // Previous period approval rate for growth calculation
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const { data: prevApprovalData } = await supabase
        .from('quote_responses')
        .select('status')
        .eq('supplier_id', user.supplierId)
        .in('status', ['approved', 'rejected'])
        .lt('created_at', new Date(currentYear, currentMonth, 1).toISOString());

      const prevTotalResponses = prevApprovalData?.length || 0;
      const prevApprovedResponses = prevApprovalData?.filter(r => r.status === 'approved').length || 0;
      const prevApprovalRate = prevTotalResponses > 0 ? (prevApprovedResponses / prevTotalResponses) * 100 : 0;
      
      const approvalGrowth = prevApprovalRate > 0 
        ? approvalRate - prevApprovalRate 
        : 0;

      setMetrics({
        activeQuotes,
        pendingProposals,
        monthlyRevenue,
        approvalRate,
        revenueGrowth,
        approvalGrowth,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados do dashboard';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const getSupplierStatusFromResponse = (responseStatus: string): RecentSupplierQuote['status'] => {
    switch (responseStatus) {
      case 'pending':
        return 'pending';
      case 'sent':
        return 'proposal_sent';
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      default:
        return 'pending';
    }
  };

  // Fetch data on mount and when user changes
  useEffect(() => {
    if (user?.role === 'supplier') {
      fetchDashboardData();
    }
  }, [user?.role, user?.supplierId]); // Removed fetchDashboardData to prevent infinite loops

  return {
    metrics,
    recentQuotes,
    isLoading,
    error,
    refetch: fetchDashboardData,
  };
};