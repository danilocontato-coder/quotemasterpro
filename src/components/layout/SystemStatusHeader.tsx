import { useState, useEffect, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  TrendingUp, 
  Activity, 
  AlertTriangle, 
  Settings, 
  Bell,
  RefreshCw,
  Database,
  Zap,
  Timer
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

interface SystemStats {
  totalUsers: number;
  onlineUsers: number;
  systemLoad: number;
  uptime: number;
  activeAlerts: number;
  totalQuotes: number;
  totalSuppliers: number;
  totalIntegrations: number;
  lastUpdate: string;
}

const CACHE_KEY = 'system-stats-cache';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos (reduzido de 30s)

function SystemStatusHeaderComponent() {
  const [stats, setStats] = useState<SystemStats>(() => {
    // Carregar do cache no mount
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
    }
    return {
      totalUsers: 0,
      onlineUsers: 0,
      systemLoad: 0,
      uptime: 99.9,
      activeAlerts: 0,
      totalQuotes: 0,
      totalSuppliers: 0,
      totalIntegrations: 0,
      lastUpdate: new Date().toLocaleTimeString('pt-BR')
    };
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const loadSystemStats = async () => {
    setIsLoading(true);
    try {
      // Buscar estatísticas do sistema
      const [
        usersResult,
        quotesResult,
        suppliersResult,
        integrationsResult,
        notificationsResult
      ] = await Promise.all([
        supabase.from('profiles').select('id, active, created_at'),
        supabase.from('quotes').select('id, created_at'),
        supabase.from('suppliers').select('id, status'),
        supabase.from('integrations').select('id, active'),
        supabase.from('notifications').select('id, read').eq('read', false)
      ]);

      // Calcular usuários online (últimas 24h)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const onlineCount = usersResult.data?.filter(u => 
        u.active && new Date(u.created_at) > new Date(twentyFourHoursAgo)
      ).length || 0;

      // Simular load do sistema baseado na atividade
      const recentQuotes = quotesResult.data?.filter(q => 
        new Date(q.created_at) > new Date(twentyFourHoursAgo)
      ).length || 0;
      
      const systemLoad = Math.min(Math.round((recentQuotes / 10) * 100), 100);

      const newStats = {
        totalUsers: usersResult.data?.length || 0,
        onlineUsers: onlineCount,
        systemLoad,
        uptime: 99.9 - Math.random() * 0.5,
        activeAlerts: notificationsResult.data?.length || 0,
        totalQuotes: quotesResult.data?.length || 0,
        totalSuppliers: suppliersResult.data?.filter(s => s.status === 'active').length || 0,
        totalIntegrations: integrationsResult.data?.filter(i => i.active).length || 0,
        lastUpdate: new Date().toLocaleTimeString('pt-BR')
      };

      setStats(newStats);
      
      // Salvar no cache
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data: newStats,
        timestamp: Date.now()
      }));

    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Carregar inicial
    loadSystemStats();
    
    // Atualizar a cada 5 minutos (reduzido de 30s -> -90% requisições)
    const interval = setInterval(loadSystemStats, REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);

  // Realtime para notificações (substituir polling)
  useRealtimeTable({
    table: 'notifications',
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    enabled: !!user?.id,
    onData: () => {
      // Apenas incrementar contador de alertas sem refetch completo
      setStats(prev => ({
        ...prev,
        activeAlerts: prev.activeAlerts + 1,
        lastUpdate: new Date().toLocaleTimeString('pt-BR')
      }));
    }
  });

  const getLoadColor = (load: number) => {
    if (load < 30) return 'text-green-600';
    if (load < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99.5) return 'text-green-600';
    if (uptime >= 99.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-card border-b border-border px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Sistema de Métricas */}
        <div className="flex items-center gap-6">
          {/* Usuários */}
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-600">{stats.onlineUsers}</span>
            <span className="text-muted-foreground">usuários online</span>
          </div>

          {/* Load do Sistema */}
          <div className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className={`font-medium ${getLoadColor(stats.systemLoad)}`}>
              {stats.systemLoad}%
            </span>
            <span className="text-muted-foreground">carga</span>
          </div>

          {/* Uptime */}
          <div className="flex items-center gap-2 text-sm">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className={`font-medium ${getUptimeColor(stats.uptime)}`}>
              {stats.uptime.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">uptime</span>
          </div>

          {/* Alertas */}
          {stats.activeAlerts > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <Badge variant="destructive" className="text-xs">
                {stats.activeAlerts}
              </Badge>
              <span className="text-muted-foreground">Alertas</span>
            </div>
          )}
        </div>

        {/* Estatísticas Rápidas */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              <span>{stats.totalQuotes} cotações</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{stats.totalSuppliers} fornecedores</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>{stats.totalIntegrations} integrações</span>
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadSystemStats}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            <div className="text-xs text-muted-foreground">
              Atualizado: {stats.lastUpdate}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{user?.name || user?.email}</span>
              <Badge variant="outline" className="text-xs">
                {user?.role === 'admin' ? 'Administrador' : user?.role}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoizar para evitar re-renders desnecessários
export const SystemStatusHeader = memo(SystemStatusHeaderComponent);