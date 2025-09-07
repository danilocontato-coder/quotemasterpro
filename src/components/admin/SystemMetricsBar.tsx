import { useSuperAdminDashboard } from '@/hooks/useSuperAdminDashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  Settings,
  RefreshCw 
} from 'lucide-react';

export function SystemMetricsBar() {
  const { metrics, systemStatus, isLoading, refetch } = useSuperAdminDashboard();

  const getOnlineUsers = () => {
    // Simular usuários online baseado no total (aproximadamente 20% online)
    return Math.floor(metrics.totalUsers * 0.2);
  };

  const getSystemLoad = () => {
    // Simular carga do sistema baseado na atividade
    const load = Math.min(Math.floor((metrics.apiCalls || 0) / 100), 100);
    return `${load}%`;
  };

  const getAlertsCount = () => {
    // Contar alertas baseado em tickets de suporte + problemas de sistema
    return metrics.supportTickets + systemStatus.filter(s => s.status !== 'online').length;
  };

  const getLoadColor = (load: string) => {
    const numLoad = parseInt(load);
    if (numLoad > 80) return 'text-red-500';
    if (numLoad > 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getUptimeColor = (uptime: string) => {
    const numUptime = parseFloat(uptime);
    if (numUptime < 99) return 'text-red-500';
    if (numUptime < 99.5) return 'text-yellow-500';
    return 'text-emerald-500';
  };

  if (isLoading) {
    return (
      <div className="hidden lg:flex items-center gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-2">
            <div className="h-4 w-4 bg-muted rounded"></div>
            <div className="h-4 w-16 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="hidden lg:flex items-center gap-4">
      {/* Usuários Online */}
      <div className="flex items-center gap-2 text-sm">
        <Users className="h-4 w-4 text-blue-500" />
        <span className="font-medium">{getOnlineUsers().toLocaleString()}</span>
        <span className="text-muted-foreground">usuários online</span>
      </div>
      
      {/* Carga do Sistema */}
      <div className="flex items-center gap-2 text-sm">
        <Activity className={`h-4 w-4 ${getLoadColor(getSystemLoad())}`} />
        <span className="font-medium">{getSystemLoad()}</span>
        <span className="text-muted-foreground">carga</span>
      </div>
      
      {/* Uptime */}
      <div className="flex items-center gap-2 text-sm">
        <TrendingUp className={`h-4 w-4 ${getUptimeColor(metrics.systemUptime)}`} />
        <span className="font-medium">{metrics.systemUptime}</span>
        <span className="text-muted-foreground">uptime</span>
      </div>

      {/* Alertas */}
      {getAlertsCount() > 0 && (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {getAlertsCount()} Alertas
        </Badge>
      )}

      {/* Botão de Configurações */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={refetch}
        className="h-8 px-2"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>

      <Button 
        variant="outline" 
        size="sm"
        className="h-8"
      >
        <Settings className="h-4 w-4 mr-1" />
        Config
      </Button>
    </div>
  );
}