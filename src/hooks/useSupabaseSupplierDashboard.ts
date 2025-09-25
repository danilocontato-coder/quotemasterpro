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

  console.log('🔍 [SUPPLIER-DASHBOARD] Hook initialized with user:', {
    hasUser: !!user,
    userId: user?.id,
    role: user?.role,
    supplierId: user?.supplierId,
    email: user?.email
  });

  const fetchDashboardData = useCallback(async () => {
    console.log('🔍 [SUPPLIER-DASHBOARD] fetchDashboardData called', { user: !!user, supplierId: user?.supplierId });
    
    if (!user) {
      console.log('🔍 [SUPPLIER-DASHBOARD] No user, setting loading to false');
      setIsLoading(false);
      return;
    }

    // Handle supplier without supplierId - try to find supplier record
    if (!user.supplierId) {
      console.log('⚠️ [SUPPLIER-DASHBOARD] User missing supplierId, attempting to find supplier record for:', user.email);
      
      try {
        const { data: supplierData, error: supplierError } = await supabase
          .from('suppliers')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (supplierError) {
          console.error('❌ Error finding supplier:', supplierError);
          setError('Erro ao buscar dados do fornecedor');
          setIsLoading(false);
          return;
        }

        if (!supplierData) {
          console.log('⚠️ No supplier record found for user:', user.email);
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

        console.log('✅ Found supplier record:', supplierData.id);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error('❌ Error in supplier lookup:', error);
        setError('Erro ao verificar dados do fornecedor');
        setIsLoading(false);
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 [SUPPLIER-DASHBOARD] Fetching dashboard data for supplier:', user.supplierId);
      console.log('🔍 [SUPPLIER-DASHBOARD] User data:', {
        id: user.id,
        email: user.email,
        role: user.role,
        supplierId: user.supplierId
      });

      // Buscar cotações disponíveis APENAS para este fornecedor específico
      console.log('🎯 CRÍTICO: Buscando cotações EXCLUSIVAS para fornecedor:', user.supplierId);
      
      // CORREÇÃO DE SEGURANÇA: Buscar apenas cotações específicas do fornecedor
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .or(`supplier_id.eq.${user.supplierId},selected_supplier_ids.cs.{${user.supplierId}}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (quotesError) {
        console.error('Erro ao buscar cotações:', quotesError);
        throw quotesError;
      }
      
      console.log('🎯 Cotações encontradas:', quotesData?.length || 0);
      console.log('📋 Dados das cotações:', quotesData);

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
    console.log('🔍 [SUPPLIER-DASHBOARD] useEffect triggered', {
      userRole: user?.role,
      supplierId: user?.supplierId,
      hasUser: !!user
    });
    
    if (user?.role === 'supplier') {
      console.log('🔍 [SUPPLIER-DASHBOARD] Calling fetchDashboardData...');
      fetchDashboardData();
    } else {
      console.log('🔍 [SUPPLIER-DASHBOARD] User is not a supplier, skipping fetch');
    }
  }, [user?.role, user?.supplierId, fetchDashboardData]);

  return {
    metrics,
    recentQuotes,
    isLoading,
    error,
    refetch: fetchDashboardData,
  };
};