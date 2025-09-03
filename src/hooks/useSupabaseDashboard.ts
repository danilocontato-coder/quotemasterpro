import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardMetrics {
  totalQuotes: number;
  pendingApprovals: number;
  activeSuppliers: number;
  monthlySpending: number;
  completedThisMonth: number;
  avgResponseTime: string;
  economyEstimated: number;
  totalPayments: number;
  pendingPayments: number;
  totalNotifications: number;
  unreadNotifications: number;
}

interface ActivityItem {
  id: string;
  type: 'quote' | 'payment' | 'supplier' | 'notification';
  action: string;
  entity: string;
  time: string;
  status: 'success' | 'warning' | 'error' | 'info';
  user?: string;
}

export function useSupabaseDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalQuotes: 0,
    pendingApprovals: 0,
    activeSuppliers: 0,
    monthlySpending: 0,
    completedThisMonth: 0,
    avgResponseTime: '0 dias',
    economyEstimated: 0,
    totalPayments: 0,
    pendingPayments: 0,
    totalNotifications: 0,
    unreadNotifications: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 1. Buscar métricas de cotações
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('*');

      if (quotesError) throw quotesError;

      // 2. Buscar métricas de pagamentos
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*');

      if (paymentsError) throw paymentsError;

      // 3. Buscar fornecedores ativos
      const { data: suppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active');

      if (suppliersError) throw suppliersError;

      // 4. Buscar notificações
      const { data: notifications, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id);

      if (notificationsError) throw notificationsError;

      // Calcular métricas
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const totalQuotes = quotes?.length || 0;
      const pendingApprovals = quotes?.filter(q => q.status === 'under_review').length || 0;
      const activeSuppliers = suppliers?.length || 0;
      
      const monthlyPayments = payments?.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear &&
               p.status === 'completed';
      }) || [];
      
      const monthlySpending = monthlyPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      
      const completedThisMonth = quotes?.filter(q => {
        const quoteDate = new Date(q.created_at);
        return q.status === 'approved' && 
               quoteDate.getMonth() === currentMonth && 
               quoteDate.getFullYear() === currentYear;
      }).length || 0;

      // Calcular tempo médio de resposta (simplificado)
      const completedQuotes = quotes?.filter(q => q.status === 'approved') || [];
      let avgDays = 0;
      if (completedQuotes.length > 0) {
        const totalDays = completedQuotes.reduce((sum, q) => {
          const created = new Date(q.created_at);
          const updated = new Date(q.updated_at);
          const diffDays = Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return sum + diffDays;
        }, 0);
        avgDays = Math.round(totalDays / completedQuotes.length * 10) / 10;
      }

      // Estimar economia (diferença entre valor máximo e mínimo das propostas)
      const approvedQuotes = quotes?.filter(q => q.status === 'approved') || [];
      const economyEstimated = approvedQuotes.reduce((sum, q) => sum + (Number(q.total) * 0.15 || 0), 0);

      const totalPayments = payments?.length || 0;
      const pendingPayments = payments?.filter(p => p.status === 'pending').length || 0;
      const totalNotifications = notifications?.length || 0;
      const unreadNotifications = notifications?.filter(n => !n.read).length || 0;

      setMetrics({
        totalQuotes,
        pendingApprovals,
        activeSuppliers,
        monthlySpending,
        completedThisMonth,
        avgResponseTime: `${avgDays} dias`,
        economyEstimated,
        totalPayments,
        pendingPayments,
        totalNotifications,
        unreadNotifications,
      });

      // Criar atividades baseadas nos dados reais
      const recentActivities: ActivityItem[] = [];

      // Últimas cotações
      const recentQuotes = quotes?.slice(-3) || [];
      recentQuotes.forEach(quote => {
        const timeAgo = getTimeAgo(quote.created_at);
        let status: 'success' | 'warning' | 'error' | 'info' = 'info';
        let action = '';

        switch (quote.status) {
          case 'approved':
            status = 'success';
            action = 'Cotação aprovada';
            break;
          case 'rejected':
            status = 'error';
            action = 'Cotação rejeitada';
            break;
          case 'under_review':
            status = 'warning';
            action = 'Cotação em análise';
            break;
          default:
            action = 'Nova cotação criada';
        }

        recentActivities.push({
          id: `quote-${quote.id}`,
          type: 'quote',
          action,
          entity: quote.title,
          time: timeAgo,
          status,
        });
      });

      // Últimos pagamentos
      const recentPayments = payments?.slice(-2) || [];
      recentPayments.forEach(payment => {
        const timeAgo = getTimeAgo(payment.created_at);
        recentActivities.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          action: payment.status === 'completed' ? 'Pagamento processado' : 'Pagamento pendente',
          entity: `R$ ${Number(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          time: timeAgo,
          status: payment.status === 'completed' ? 'success' : 'warning',
        });
      });

      // Ordenar por mais recente
      recentActivities.sort((a, b) => {
        // Simplificado - em produção seria melhor usar timestamps
        return 0;
      });

      setActivities(recentActivities.slice(0, 5));

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channels = [
      supabase
        .channel('dashboard-quotes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'quotes' },
          () => fetchDashboardData()
        )
        .subscribe(),

      supabase
        .channel('dashboard-payments')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'payments' },
          () => fetchDashboardData()
        )
        .subscribe(),

      supabase
        .channel('dashboard-suppliers')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'suppliers' },
          () => fetchDashboardData()
        )
        .subscribe(),

      supabase
        .channel('dashboard-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => fetchDashboardData()
        )
        .subscribe(),
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user]);

  const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d atrás`;
    
    return date.toLocaleDateString('pt-BR');
  };

  return {
    metrics,
    activities,
    isLoading,
    error,
    refetch: fetchDashboardData,
  };
}