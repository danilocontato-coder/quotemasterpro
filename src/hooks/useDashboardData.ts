import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardMetrics {
  totalUsers?: number;
  activeClients?: number;
  activeSuppliers?: number;
  totalQuotes?: number;
  pendingApprovals?: number;
  monthlyRevenue?: number;
  monthlySpending?: number;
  systemUptime?: string;
  apiCalls?: number;
  completedThisMonth?: number;
  avgResponseTime?: string;
  supportTickets?: number;
}

interface ActivityItem {
  id: string;
  type: string;
  action: string;
  entity: string;
  time: string;
  status: 'success' | 'warning' | 'error' | 'info';
  user?: string;
}

interface SystemHealth {
  service: string;
  status: 'online' | 'warning' | 'offline';
  uptime: string;
  response: string;
}

// Dados específicos por papel
const getMetricsByRole = (role: string): DashboardMetrics => {
  switch (role) {
    case 'super_admin':
      return {
        totalUsers: 2847,
        activeClients: 142,
        activeSuppliers: 89,
        totalQuotes: 15642,
        pendingApprovals: 45,
        monthlyRevenue: 127500.00,
        systemUptime: '99.9%',
        apiCalls: 1234567,
        supportTickets: 23
      };
      
    case 'admin':
      return {
        totalUsers: 234,
        activeClients: 45,
        activeSuppliers: 67,
        totalQuotes: 1256,
        pendingApprovals: 12,
        monthlyRevenue: 89420.00,
        systemUptime: '99.8%'
      };
      
    case 'manager':
      return {
        totalQuotes: 87,
        pendingApprovals: 5,
        activeSuppliers: 23,
        monthlySpending: 45600.00,
        completedThisMonth: 32,
        avgResponseTime: '2.5 dias'
      };
      
    case 'collaborator':
      return {
        totalQuotes: 23,
        pendingApprovals: 2,
        activeSuppliers: 12,
        monthlySpending: 12300.00,
        completedThisMonth: 8,
        avgResponseTime: '1.8 dias'
      };
      
    case 'supplier':
      return {
        totalQuotes: 34,
        pendingApprovals: 3,
        monthlyRevenue: 23400.00,
        completedThisMonth: 15,
        avgResponseTime: '4.2 horas'
      };
      
    default:
      return {};
  }
};

const getActivitiesByRole = (role: string): ActivityItem[] => {
  switch (role) {
    case 'super_admin':
      return [
        { id: '1', type: 'client', action: 'Novo cliente cadastrado', entity: 'Condomínio Ville Real', time: '2 min atrás', status: 'success' },
        { id: '2', type: 'supplier', action: 'Fornecedor aprovado', entity: 'TechFlow Solutions', time: '15 min atrás', status: 'success' },
        { id: '3', type: 'system', action: 'API Stripe configurada', entity: 'Sistema Global', time: '1h atrás', status: 'info' },
        { id: '4', type: 'support', action: 'Ticket crítico aberto', entity: '#TK-2024-001', time: '2h atrás', status: 'warning' },
        { id: '5', type: 'backup', action: 'Backup automático concluído', entity: 'Database', time: '3h atrás', status: 'success' }
      ];
      
    case 'admin':
      return [
        { id: '1', type: 'user', action: 'Novo usuário cadastrado', entity: 'João Silva', time: '2 min atrás', status: 'success' },
        { id: '2', type: 'company', action: 'Empresa aprovada', entity: 'Alpha Ltda', time: '15 min atrás', status: 'success' },
        { id: '3', type: 'payment', action: 'Pagamento recebido', entity: 'R$ 2.400,00', time: '1h atrás', status: 'success' },
        { id: '4', type: 'system', action: 'Manutenção programada', entity: 'Amanhã às 02:00', time: '2h atrás', status: 'warning' }
      ];
      
    case 'manager':
      return [
        { id: '1', type: 'quote', action: 'Cotação aprovada', entity: '#QT-2024-156', time: '10 min atrás', status: 'success', user: 'Maria Santos' },
        { id: '2', type: 'proposal', action: 'Nova proposta recebida', entity: 'Material de limpeza', time: '30 min atrás', status: 'info', user: 'Fornecedor Alpha' },
        { id: '3', type: 'approval', action: 'Aprovação pendente', entity: '#QT-2024-157', time: '1h atrás', status: 'warning' },
        { id: '4', type: 'payment', action: 'Pagamento processado', entity: 'R$ 3.450,00', time: '2h atrás', status: 'success' }
      ];
      
    case 'collaborator':
      return [
        { id: '1', type: 'quote', action: 'Cotação enviada', entity: '#QT-2024-158', time: '5 min atrás', status: 'success' },
        { id: '2', type: 'quote', action: 'Cotação rejeitada', entity: '#QT-2024-155', time: '2h atrás', status: 'error' },
        { id: '3', type: 'supplier', action: 'Novo fornecedor adicionado', entity: 'Beta Fornecimentos', time: '4h atrás', status: 'info' }
      ];
      
    case 'supplier':
      return [
        { id: '1', type: 'quote', action: 'Nova solicitação', entity: 'Materiais elétricos', time: '20 min atrás', status: 'info' },
        { id: '2', type: 'proposal', action: 'Proposta aceita', entity: '#PR-2024-089', time: '1h atrás', status: 'success' },
        { id: '3', type: 'stock', action: 'Estoque atualizado', entity: 'Cabo elétrico 2.5mm', time: '3h atrás', status: 'info' }
      ];
      
    default:
      return [];
  }
};

const getSystemHealthByRole = (role: string): SystemHealth[] => {
  const baseHealth: SystemHealth[] = [
    { service: 'API Gateway', status: 'online', uptime: '99.9%', response: '120ms' },
    { service: 'Database', status: 'online', uptime: '99.8%', response: '45ms' },
    { service: 'Email Service', status: 'online', uptime: '99.7%', response: '200ms' }
  ];

  if (role === 'super_admin') {
    return [
      ...baseHealth,
      { service: 'WhatsApp API', status: 'warning', uptime: '98.2%', response: '350ms' },
      { service: 'Stripe Integration', status: 'online', uptime: '99.9%', response: '180ms' },
      { service: 'Backup System', status: 'online', uptime: '100%', response: '50ms' }
    ];
  }

  return baseHealth;
};

export function useDashboardData() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({});
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.role) return;

      setIsLoading(true);
      
      try {
        // Simular carregamento de dados
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const roleMetrics = getMetricsByRole(user.role);
        const roleActivities = getActivitiesByRole(user.role);
        const roleSystemHealth = getSystemHealthByRole(user.role);
        
        setMetrics(roleMetrics);
        setActivities(roleActivities);
        setSystemHealth(roleSystemHealth);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.role]);

  // Métodos para atualização em tempo real (preparados para Supabase)
  const refreshMetrics = async () => {
    // TODO: Implementar refresh dos dados via Supabase
    console.log('Refreshing metrics - Ready for Supabase');
  };

  const subscribeToRealtime = () => {
    // TODO: Subscribe to Supabase realtime updates
    console.log('Subscribing to realtime updates - Ready for Supabase');
  };

  const addActivity = (activity: Omit<ActivityItem, 'id'>) => {
    const newActivity = {
      ...activity,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
  };

  return {
    metrics,
    activities,
    systemHealth,
    isLoading,
    refreshMetrics,
    subscribeToRealtime,
    addActivity
  };
}