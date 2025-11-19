import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AutoSyncIndicator() {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [nextSync, setNextSync] = useState<Date | null>(null);

  useEffect(() => {
    // Buscar última sincronização
    const fetchLastSync = async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('created_at')
        .eq('action', 'SCHEDULED_SYNC_COMPLETED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setLastSync(new Date(data.created_at));
        // Calcular próxima sync (15 minutos após última)
        const next = new Date(data.created_at);
        next.setMinutes(next.getMinutes() + 15);
        setNextSync(next);
      }
    };

    fetchLastSync();

    // Subscrever mudanças em tempo real
    const channel = supabase
      .channel('sync-status')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: 'action=eq.SCHEDULED_SYNC_COMPLETED'
        },
        (payload) => {
          const newDate = new Date(payload.new.created_at);
          setLastSync(newDate);
          const next = new Date(newDate);
          next.setMinutes(next.getMinutes() + 15);
          setNextSync(next);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ✅ Atualizar timestamp apenas quando necessário (menos re-renders)
  useEffect(() => {
    if (!lastSync) return;

    const lastSyncTime = lastSync.getTime();
    const now = Date.now();
    const diffMs = now - lastSyncTime;
    
    // Atualizar a cada 1 min se < 10 min atrás, senão a cada 5 min
    const updateInterval = diffMs < 10 * 60 * 1000 ? 60000 : 300000;
    
    const interval = setInterval(() => {
      setLastSync(new Date(lastSyncTime)); // Forçar re-render
    }, updateInterval);

    return () => clearInterval(interval);
  }, [lastSync?.getTime()]);

  if (!lastSync && !isSyncing) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge 
        variant={isSyncing ? "default" : "secondary"}
        className="gap-2 px-3 py-2 shadow-lg"
      >
        {isSyncing ? (
          <>
            <RefreshCw className="h-3 w-3 animate-spin" />
            Sincronizando...
          </>
        ) : (
          <>
            <CheckCircle className="h-3 w-3" />
            {lastSync ? (
              <span className="text-xs">
                Sync há {formatDistanceToNow(lastSync, { locale: ptBR })}
              </span>
            ) : (
              <span className="text-xs">Aguardando sync</span>
            )}
          </>
        )}
      </Badge>
      
      {nextSync && !isSyncing && (
        <div className="text-[10px] text-muted-foreground text-center mt-1">
          Próxima em {formatDistanceToNow(nextSync, { locale: ptBR })}
        </div>
      )}
    </div>
  );
}
