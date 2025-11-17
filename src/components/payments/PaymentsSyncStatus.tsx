import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SyncStatus {
  lastSync: string | null;
  webhookEvents: number;
  nextCronRun: string | null;
  isHealthy: boolean;
}

export function PaymentsSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    lastSync: null,
    webhookEvents: 0,
    nextCronRun: null,
    isHealthy: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSyncStatus();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchSyncStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchSyncStatus = async () => {
    try {
      // Buscar último log de sincronização automática
      const { data: lastSyncLog } = await supabase
        .from('audit_logs')
        .select('created_at, details')
        .eq('action', 'SCHEDULED_SYNC_COMPLETED')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Buscar eventos de webhook das últimas 24h
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      
      const { count: webhookCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'PAYMENT_WEBHOOK_RECEIVED')
        .gte('created_at', oneDayAgo.toISOString());

      // Calcular próxima execução (a cada 5 min)
      const now = new Date();
      const minutes = now.getMinutes();
      const nextRunMinutes = Math.ceil(minutes / 5) * 5;
      const nextRun = new Date(now);
      nextRun.setMinutes(nextRunMinutes);
      nextRun.setSeconds(0);
      
      // Se passou da hora, adicionar 1 hora
      if (nextRun <= now) {
        nextRun.setMinutes(nextRun.getMinutes() + 5);
      }

      const isHealthy = lastSyncLog 
        ? new Date().getTime() - new Date(lastSyncLog.created_at).getTime() < 10 * 60 * 1000 // < 10 min
        : false;

      setStatus({
        lastSync: lastSyncLog?.created_at || null,
        webhookEvents: webhookCount || 0,
        nextCronRun: nextRun.toISOString(),
        isHealthy
      });
    } catch (error) {
      console.error('Erro ao buscar status de sincronização:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Activity className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Sincronização Automática</CardTitle>
          <Badge variant={status.isHealthy ? "default" : "destructive"} className="text-xs">
            {status.isHealthy ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Ativo
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                Inativo
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Última sincronização:</span>
          </div>
          <span className="font-medium text-foreground">
            {status.lastSync 
              ? formatDistanceToNow(new Date(status.lastSync), { 
                  addSuffix: true, 
                  locale: ptBR 
                })
              : 'Nunca'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>Webhooks (24h):</span>
          </div>
          <span className="font-medium text-foreground">
            {status.webhookEvents} eventos
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Próxima execução:</span>
          </div>
          <span className="font-medium text-foreground">
            {status.nextCronRun 
              ? formatDistanceToNow(new Date(status.nextCronRun), { 
                  addSuffix: true, 
                  locale: ptBR 
                })
              : 'N/A'}
          </span>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Sincronização automática a cada 5 minutos para pagamentos pendentes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
