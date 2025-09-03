import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// DEPRECATED: Use useSupabaseDashboard instead
// Este hook mantém apenas dados de exemplo para compatibilidade com código legado

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

/**
 * DEPRECATED: This hook provides mock data for legacy compatibility.
 * For real data, use useSupabaseDashboard from @/hooks/useSupabaseDashboard
 */
export function useDashboardData() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({});
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.warn('⚠️ useDashboardData is deprecated. Use useSupabaseDashboard for real data instead.');
    
    if (!user?.role) return;

    setIsLoading(true);
    
    // Return empty data since this is deprecated
    setTimeout(() => {
      setMetrics({});
      setActivities([]);
      setSystemHealth([]);
      setIsLoading(false);
    }, 100);
  }, [user?.role]);

  // Métodos para compatibilidade
  const refreshMetrics = async () => {
    console.warn('⚠️ useDashboardData.refreshMetrics is deprecated. Use useSupabaseDashboard instead.');
  };

  const subscribeToRealtime = () => {
    console.warn('⚠️ useDashboardData.subscribeToRealtime is deprecated. Use useSupabaseDashboard instead.');
  };

  const addActivity = (activity: Omit<ActivityItem, 'id'>) => {
    console.warn('⚠️ useDashboardData.addActivity is deprecated. Use useSupabaseDashboard instead.');
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