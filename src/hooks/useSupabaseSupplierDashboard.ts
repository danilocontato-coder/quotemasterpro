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
      
      // FASE 1: Buscar cotações através de quote_suppliers
      const { data: quoteSupplierData, error: quotesError } = await supabase
        .from('quote_suppliers')
        .select(`
          quote_id,
          quotes:quote_id (
            id,
            title,
            client_name,
            status,
            total,
            deadline,
            created_at
          )
        `)
        .eq('supplier_id', user.supplierId)
        .order('created_at', { ascending: false });

      if (quotesError) {
        console.error('❌ [SUPPLIER-DASHBOARD] Erro ao buscar cotações:', {
          error: quotesError,
          supplierId: user.supplierId,
          errorMessage: quotesError?.message,
          errorCode: quotesError?.code,
          errorDetails: quotesError?.details,
          errorHint: quotesError?.hint,
        });
        toast({
          title: 'Erro ao carregar cotações',
          description: `${quotesError?.message || 'Erro desconhecido'}. Verifique o console (F12) para mais detalhes.`,
          variant: 'destructive',
        });
        throw quotesError;
      }
      
      // Flatten quotes data
      const quotesData = quoteSupplierData?.map(qs => qs.quotes).filter(Boolean) || [];
      
      console.log('🎯 Cotações encontradas:', quotesData?.length || 0);
      console.log('📋 Dados das cotações:', quotesData);

      // FASE 2: Buscar TODAS as propostas do fornecedor
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('quote_responses')
        .select('*')
        .eq('supplier_id', user.supplierId)
        .order('created_at', { ascending: false });

      if (proposalsError) {
        console.error('❌ [SUPPLIER-DASHBOARD] Erro ao buscar propostas:', {
          error: proposalsError,
          supplierId: user.supplierId,
          errorMessage: proposalsError?.message,
          errorCode: proposalsError?.code,
        });
        toast({
          title: 'Aviso',
          description: `Erro ao carregar propostas: ${proposalsError?.message || 'Erro desconhecido'}`,
          variant: 'default',
        });
        // Não travar, continuar com propostas vazias
      }

      console.log('📊 Propostas encontradas:', proposalsData?.length || 0);

      // FASE 4: Transform to recent quotes format with proposal status
      const transformedRecentQuotes: RecentSupplierQuote[] = (quotesData || [])
        .slice(0, 10)
        .map(quote => {
          // Buscar proposta do fornecedor para esta cotação
          const proposal = proposalsData?.find(p => p.quote_id === quote.id);

          // Status do fornecedor (não da cotação)
          let supplierStatus: RecentSupplierQuote['status'] = 'pending';
          if (proposal) {
            if (['approved', 'selected'].includes(proposal.status)) {
              supplierStatus = 'approved';
            } else if (['sent', 'submitted'].includes(proposal.status)) {
              supplierStatus = 'proposal_sent';
            } else if (proposal.status === 'rejected') {
              supplierStatus = 'rejected';
            }
          }

          return {
            id: quote.id,
            title: quote.title,
            client: quote.client_name || 'Cliente não informado',
            status: supplierStatus,
            deadline: quote.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            estimatedValue: proposal?.total_amount 
              ? Number(proposal.total_amount) 
              : (quote.total || 0),
          };
        });

      setRecentQuotes(transformedRecentQuotes);

      // Calculate metrics
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      // FASE 3.1: Cotações ativas (abertas para propostas)
      const activeQuotes = quotesData?.filter(quote => {
        return quote && ['sent', 'receiving', 'under_review'].includes(quote.status);
      }).length || 0;
      
      // FASE 3.2: Propostas pendentes (enviadas mas não aprovadas/rejeitadas)
      const pendingProposals = proposalsData?.filter(p => 
        ['sent', 'submitted'].includes(p.status)
      ).length || 0;

      // FASE 3.3: Receita mensal baseada em propostas aprovadas
      const monthlyProposals = proposalsData?.filter(p => {
        const proposalDate = new Date(p.created_at);
        return ['approved', 'selected'].includes(p.status) && 
               proposalDate.getMonth() === currentMonth && 
               proposalDate.getFullYear() === currentYear;
      }) || [];
      
      const monthlyRevenue = monthlyProposals.reduce((sum, proposal) => 
        sum + (Number(proposal.total_amount) || 0), 0
      );

      // FASE 3.5: Crescimento de vendas baseado em propostas
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      const prevMonthProposals = proposalsData?.filter(p => {
        const proposalDate = new Date(p.created_at);
        return ['approved', 'selected'].includes(p.status) && 
               proposalDate.getMonth() === prevMonth && 
               proposalDate.getFullYear() === prevYear;
      }) || [];
      
      const prevMonthRevenue = prevMonthProposals.reduce((sum, proposal) => 
        sum + (Number(proposal.total_amount) || 0), 0
      );

      const revenueGrowth = prevMonthRevenue > 0 
        ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 
        : monthlyRevenue > 0 ? 100 : 0;

      // FASE 3.4: Taxa de aprovação baseada em propostas
      const submittedProposals = proposalsData?.filter(p => 
        ['sent', 'submitted', 'approved', 'selected', 'rejected'].includes(p.status)
      ) || [];
      const approvedProposals = proposalsData?.filter(p => 
        ['approved', 'selected'].includes(p.status)
      ) || [];
      
      const approvalRate = submittedProposals.length > 0 
        ? (approvedProposals.length / submittedProposals.length) * 100 
        : 0;

      // Simple approval growth (last 30 days vs previous 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const recentCompletedProposals = proposalsData?.filter(p => 
        ['approved', 'selected', 'rejected'].includes(p.status) && 
        new Date(p.created_at) >= thirtyDaysAgo
      ) || [];
      const recentApprovedProposals = proposalsData?.filter(p => 
        ['approved', 'selected'].includes(p.status) && 
        new Date(p.created_at) >= thirtyDaysAgo
      ) || [];
      
      const prevCompletedProposals = proposalsData?.filter(p => 
        ['approved', 'selected', 'rejected'].includes(p.status) && 
        new Date(p.created_at) >= sixtyDaysAgo && 
        new Date(p.created_at) < thirtyDaysAgo
      ) || [];
      const prevApprovedProposals = proposalsData?.filter(p => 
        ['approved', 'selected'].includes(p.status) && 
        new Date(p.created_at) >= sixtyDaysAgo && 
        new Date(p.created_at) < thirtyDaysAgo
      ) || [];

      const recentApprovalRate = recentCompletedProposals.length > 0 
        ? (recentApprovedProposals.length / recentCompletedProposals.length) * 100 
        : 0;
      const prevApprovalRate = prevCompletedProposals.length > 0 
        ? (prevApprovedProposals.length / prevCompletedProposals.length) * 100 
        : 0;
      
      const approvalGrowth = recentApprovalRate - prevApprovalRate;

      // FASE 5: Logs de depuração
      console.log('📊 [MÉTRICAS CALCULADAS]', {
        activeQuotes,
        pendingProposals,
        monthlyRevenue,
        approvalRate: approvalRate.toFixed(2) + '%',
        revenueGrowth: revenueGrowth.toFixed(2) + '%',
        totalProposals: proposalsData?.length || 0,
        totalQuotesLinked: quotesData?.length || 0,
        submittedProposals: submittedProposals.length,
        approvedProposals: approvedProposals.length,
        monthlyProposals: monthlyProposals.length,
      });

      setMetrics({
        activeQuotes,
        pendingProposals,
        monthlyRevenue,
        approvalRate,
        revenueGrowth,
        approvalGrowth,
      });

      console.log('✅ [SUPPLIER-DASHBOARD] Dashboard data loaded successfully', {
        quotesCount: quotesData?.length || 0,
        proposalsCount: proposalsData?.length || 0,
        recentQuotesCount: transformedRecentQuotes.length,
      });

    } catch (err: any) {
      console.error('❌ [SUPPLIER-DASHBOARD] Erro CRÍTICO ao buscar dados do dashboard:', {
        error: err,
        supplierId: user?.supplierId,
        errorMessage: err?.message,
        errorCode: err?.code,
        errorDetails: err?.details,
        stack: err?.stack,
      });
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados do dashboard';
      setError(errorMessage);
      toast({
        title: '❌ Erro Crítico',
        description: `${errorMessage}. Pressione F12 para ver detalhes no console ou consulte o guia de troubleshooting.`,
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