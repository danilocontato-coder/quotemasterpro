import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SuperAdminMetrics {
  totalUsers: number;
  totalClients: number;
  totalSuppliers: number;
  totalQuotes: number;
  totalRevenue: number;
  monthlyRevenue: number;
  systemUptime: string;
  apiCalls: number;
  storageUsed: number;
  activeSubscriptions: number;
  supportTickets: number;
  todaySignups: number;
}

interface SystemStatus {
  service: string;
  status: 'online' | 'warning' | 'offline';
  uptime: string;
  responseTime: string;
  lastCheck: string;
}

interface ActivityItem {
  id: string;
  type: 'user' | 'client' | 'supplier' | 'quote' | 'payment' | 'system';
  action: string;
  entity: string;
  time: string;
  status: 'success' | 'warning' | 'error' | 'info';
  user?: string;
  details?: string;
}

interface FinancialSummary {
  totalRevenue: number;
  monthlyRevenue: number;
  clientsCount: number;
  suppliersCount: number;
  averageOrderValue: number;
  growth: number;
}

export function useSuperAdminDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SuperAdminMetrics>({
    totalUsers: 0,
    totalClients: 0,
    totalSuppliers: 0,
    totalQuotes: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    systemUptime: '99.9%',
    apiCalls: 0,
    storageUsed: 0,
    activeSubscriptions: 0,
    supportTickets: 0,
    todaySignups: 0,
  });
  
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    clientsCount: 0,
    suppliersCount: 0,
    averageOrderValue: 0,
    growth: 0,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuperAdminData = async () => {
    if (!user || user.role !== 'admin') {
      console.log('🚫 SuperAdmin Dashboard: Access denied or no user');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('👑 SuperAdmin Dashboard: Starting data fetch...');

      // Buscar todos os dados em paralelo
      const [
        usersRes,
        clientsRes,
        suppliersRes,
        quotesRes,
        paymentsRes,
        ticketsRes,
        profilesRes,
        clientUsageRes,
        auditLogsRes
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('quotes').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('support_tickets').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('client_usage').select('*'),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50) // Aumentar para 50 para demonstrar paginação
      ]);

      // Verificar erros
      const responses = [usersRes, clientsRes, suppliersRes, quotesRes, paymentsRes, ticketsRes, profilesRes, clientUsageRes, auditLogsRes];
      for (const response of responses) {
        if (response.error) {
          console.error('❌ SuperAdmin Dashboard: Query error:', response.error);
          throw response.error;
        }
      }

      const users = usersRes.data || [];
      const clients = clientsRes.data || [];
      const suppliers = suppliersRes.data || [];
      const quotes = quotesRes.data || [];
      const payments = paymentsRes.data || [];
      const tickets = ticketsRes.data || [];
      const profiles = profilesRes.data || [];
      const clientUsage = clientUsageRes.data || [];
      const auditLogs = auditLogsRes.data || [];

      console.log('📊 SuperAdmin Dashboard: Data fetched successfully:', {
        users: users.length,
        clients: clients.length,
        suppliers: suppliers.length,
        quotes: quotes.length,
        payments: payments.length,
        tickets: tickets.length,
        profiles: profiles.length,
        auditLogs: auditLogs.length
      });

      // Calcular métricas
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const today = new Date().toDateString();

      const totalUsers = profiles.length;
      const totalClients = clients.length;
      const totalSuppliers = suppliers.filter(s => s.status === 'active').length;
      const totalQuotes = quotes.length;

      // Receita total de pagamentos completados
      const completedPayments = payments.filter(p => p.status === 'completed');
      const totalRevenue = completedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Receita do mês atual
      const monthlyPayments = completedPayments.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      });
      const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Storage usado (simulado baseado no usage)
      const storageUsed = clientUsage.reduce((sum, u) => sum + (Number(u.storage_used_gb) || 0), 0);

      // Tickets de suporte ativos
      const supportTickets = tickets.filter(t => t.status !== 'closed').length;

      // Cadastros de hoje
      const todaySignups = profiles.filter(p => {
        const signupDate = new Date(p.created_at);
        return signupDate.toDateString() === today;
      }).length;

      // API calls simulado baseado em atividade
      const apiCalls = auditLogs.length * 15; // Estimativa

      // Assinaturas ativas (clientes com planos)
      const activeSubscriptions = clients.filter(c => c.subscription_plan_id).length;

      setMetrics({
        totalUsers,
        totalClients,
        totalSuppliers,
        totalQuotes,
        totalRevenue,
        monthlyRevenue,
        systemUptime: '99.9%', // Fixo para demonstração
        apiCalls,
        storageUsed,
        activeSubscriptions,
        supportTickets,
        todaySignups,
      });

      // Status do sistema (simulado)
      setSystemStatus([
        {
          service: 'Database',
          status: 'online',
          uptime: '99.9%',
          responseTime: '12ms',
          lastCheck: 'Agora'
        },
        {
          service: 'API Gateway',
          status: 'online',
          uptime: '99.8%',
          responseTime: '25ms',
          lastCheck: 'Agora'
        },
        {
          service: 'Storage',
          status: 'online',
          uptime: '100%',
          responseTime: '8ms',
          lastCheck: 'Agora'
        },
        {
          service: 'WhatsApp Integration',
          status: 'online',
          uptime: '98.5%',
          responseTime: '150ms',
          lastCheck: '1 min atrás'
        }
      ]);

      // Resumo financeiro
      const averageOrderValue = quotes.length > 0 ? totalRevenue / quotes.length : 0;
      const lastMonthRevenue = payments.filter(p => {
        const paymentDate = new Date(p.created_at);
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const year = currentMonth === 0 ? currentYear - 1 : currentYear;
        return paymentDate.getMonth() === lastMonth && paymentDate.getFullYear() === year && p.status === 'completed';
      }).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const growth = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      setFinancialSummary({
        totalRevenue,
        monthlyRevenue,
        clientsCount: totalClients,
        suppliersCount: totalSuppliers,
        averageOrderValue,
        growth,
      });

      // Criar atividades baseadas nos audit logs
      const recentActivities: ActivityItem[] = auditLogs.slice(0, 25).map((log, index) => { // Aumentar para 25 atividades
        const timeAgo = getTimeAgo(log.created_at);
        
        let type: ActivityItem['type'] = 'system';
        let status: ActivityItem['status'] = 'info';
        
        if (log.entity_type === 'quotes') type = 'quote';
        else if (log.entity_type === 'payments') type = 'payment';
        else if (log.entity_type === 'clients') type = 'client';
        else if (log.entity_type === 'suppliers') type = 'supplier';
        else if (log.entity_type === 'users') type = 'user';

        if (log.action.includes('CREATE')) status = 'success';
        else if (log.action.includes('DELETE')) status = 'error';
        else if (log.action.includes('UPDATE')) status = 'warning';

        return {
          id: log.id,
          type,
          action: formatAction(log.action),
          entity: log.entity_id,
          time: timeAgo,
          status,
          details: log.action
        };
      });

      setActivities(recentActivities);

      console.log('✅ SuperAdmin Dashboard: All data loaded successfully!');

    } catch (err) {
      console.error('❌ SuperAdmin Dashboard: Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAction = (action: string): string => {
    const actionMap: Record<string, string> = {
      'QUOTE_CREATE': 'Nova cotação criada',
      'QUOTE_UPDATE': 'Cotação atualizada',
      'QUOTE_DELETE': 'Cotação removida',
      'PAYMENT_CREATE': 'Pagamento criado',
      'PAYMENT_UPDATE': 'Pagamento atualizado',
      'CLIENT_CREATE': 'Cliente cadastrado',
      'CLIENT_UPDATE': 'Cliente atualizado',
      'SUPPLIER_CREATE': 'Fornecedor cadastrado',
      'SUPPLIER_UPDATE': 'Fornecedor atualizado',
      'USER_CREATE': 'Usuário criado',
      'USER_UPDATE': 'Usuário atualizado',
      'USER_LOGIN': 'Login realizado',
      'USER_LOGOUT': 'Logout realizado',
    };

    return actionMap[action] || action.replace(/_/g, ' ').toLowerCase();
  };

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

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSuperAdminData();
    }
  }, [user?.role]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    console.log('🔄 SuperAdmin Dashboard: Setting up real-time subscriptions');

    let timeoutId: NodeJS.Timeout;
    const debouncedRefetch = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(fetchSuperAdminData, 2000);
    };

    const channels = [
      supabase
        .channel('superadmin-users')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, debouncedRefetch)
        .subscribe(),
      
      supabase
        .channel('superadmin-clients')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, debouncedRefetch)
        .subscribe(),
      
      supabase
        .channel('superadmin-suppliers')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, debouncedRefetch)
        .subscribe(),
      
      supabase
        .channel('superadmin-quotes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, debouncedRefetch)
        .subscribe(),
      
      supabase
        .channel('superadmin-payments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, debouncedRefetch)
        .subscribe(),
    ];

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user?.role]);

  return {
    metrics,
    activities,
    systemStatus,
    financialSummary,
    isLoading,
    error,
    refetch: fetchSuperAdminData,
  };
}