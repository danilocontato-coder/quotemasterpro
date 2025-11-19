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
        .eq('action', 'PAYMENT_SYNC')
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
          filter: 'action=eq.PAYMENT_SYNC'
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

    // Atualizar a cada 30 segundos para manter o "X min atrás" atualizado
    const interval = setInterval(() => {
      setLastSync(prev => prev ? new Date(prev) : null);
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

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
