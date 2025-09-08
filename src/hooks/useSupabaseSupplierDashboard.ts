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
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Handle supplier without supplierId - try to find supplier record
    if (!user.supplierId) {
      console.log('⚠️ User missing supplierId, attempting to find supplier record...');
      
      try {
        const { data: supplierData, error: supplierError } = await supabase
          .from('suppliers')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (supplierError) {
          console.error('Error finding supplier:', supplierError);
        }

        if (!supplierData) {
          console.log('No supplier record found for user:', user.email);
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

        // Update profile with found supplier_id
        await supabase
          .from('profiles')
          .update({ supplier_id: supplierData.id })
          .eq('id', user.id);

        // Reload user data - dispatch event for AuthContext to catch
        window.dispatchEvent(new CustomEvent('user-profile-updated'));
        
        console.log('✅ Supplier ID updated in profile:', supplierData.id);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error('Error in supplier lookup:', error);
        setIsLoading(false);
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching dashboard data for supplier:', user.supplierId);

      // Buscar cotações direcionadas para este fornecedor especificamente
      console.log('🎯 CRÍTICO: Buscando APENAS cotações direcionadas especificamente para:', user.supplierId);
      
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          id,
          title,
          client_name,
          status,
          total,
          deadline,
          created_at,
          updated_at
        `)
        .eq('supplier_id', user.supplierId);

      if (quotesError) throw quotesError;

      console.log('🎯 Cotações direcionadas encontradas:', quotesData?.length || 0);

      // Transform to recent quotes format
      const transformedRecentQuotes: RecentSupplierQuote[] = (quotesData || []).map(quote => {
        return {
          id: quote.id,
          title: quote.title,
          client: quote.client_name || 'Cliente não informado',
          status: getSupplierStatusFromQuoteStatus(quote.status),
          deadline: quote.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedValue: quote.total || 0,
        };
      });

      setRecentQuotes(transformedRecentQuotes);

      // Calculate metrics
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      // Active quotes count
      const activeQuotes = quotesData?.length || 0;
      
      // Pending proposals (quotes with status 'sent' or 'receiving')
      const pendingProposals = quotesData?.filter(q => 
        ['sent', 'receiving'].includes(q.status)
      ).length || 0;

      // Monthly revenue (approved quotes this month)
      const monthlyQuotes = quotesData?.filter(q => {
        const quoteDate = new Date(q.created_at);
        return q.status === 'approved' && 
               quoteDate.getMonth() === currentMonth && 
               quoteDate.getFullYear() === currentYear;
      }) || [];
      
      const monthlyRevenue = monthlyQuotes.reduce((sum, quote) => 
        sum + (quote.total || 0), 0
      );

      // Previous month for growth calculation
      const prevMonthQuotes = quotesData?.filter(q => {
        const quoteDate = new Date(q.created_at);
        return q.status === 'approved' && 
               quoteDate.getMonth() === currentMonth - 1 && 
               quoteDate.getFullYear() === currentYear;
      }) || [];
      
      const prevMonthRevenue = prevMonthQuotes.reduce((sum, quote) => 
        sum + (quote.total || 0), 0
      );

      const revenueGrowth = prevMonthRevenue > 0 
        ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 
        : 0;

      // Approval rate calculation (simplified)
      const allQuotes = quotesData || [];
      const completedQuotes = allQuotes.filter(q => ['approved', 'rejected'].includes(q.status));
      const approvedQuotes = allQuotes.filter(q => q.status === 'approved');
      
      const approvalRate = completedQuotes.length > 0 
        ? (approvedQuotes.length / completedQuotes.length) * 100 
        : 0;

      // Simple approval growth (last 30 days vs previous 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const recentCompletedQuotes = allQuotes.filter(q => 
        ['approved', 'rejected'].includes(q.status) && 
        new Date(q.created_at) >= thirtyDaysAgo
      );
      const recentApprovedQuotes = allQuotes.filter(q => 
        q.status === 'approved' && 
        new Date(q.created_at) >= thirtyDaysAgo
      );
      
      const prevCompletedQuotes = allQuotes.filter(q => 
        ['approved', 'rejected'].includes(q.status) && 
        new Date(q.created_at) >= sixtyDaysAgo && 
        new Date(q.created_at) < thirtyDaysAgo
      );
      const prevApprovedQuotes = allQuotes.filter(q => 
        q.status === 'approved' && 
        new Date(q.created_at) >= sixtyDaysAgo && 
        new Date(q.created_at) < thirtyDaysAgo
      );

      const recentApprovalRate = recentCompletedQuotes.length > 0 
        ? (recentApprovedQuotes.length / recentCompletedQuotes.length) * 100 
        : 0;
      const prevApprovalRate = prevCompletedQuotes.length > 0 
        ? (prevApprovedQuotes.length / prevCompletedQuotes.length) * 100 
        : 0;
      
      const approvalGrowth = recentApprovalRate - prevApprovalRate;

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

  const getSupplierStatusFromQuoteStatus = (quoteStatus: string): RecentSupplierQuote['status'] => {
    switch (quoteStatus) {
      case 'sent':
      case 'receiving':
        return 'pending';
      case 'under_review':
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