import { useEffect, useState, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

interface SyncStatus {
  lastSync: string | null;
  webhookEvents: number;
  nextCronRun: string | null;
  isHealthy: boolean;
}

const CACHE_KEY = 'payment-sync-status-cache';
const CACHE_TTL = 1 * 60 * 1000; // 1 minuto
const FALLBACK_INTERVAL = 2 * 60 * 1000; // 2 minutos (reduzido de 30s)

function PaymentsSyncStatusComponent() {
  const [status, setStatus] = useState<SyncStatus>(() => {
    // Carregar do cache
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
    }
    return {
      lastSync: null,
      webhookEvents: 0,
      nextCronRun: null,
      isHealthy: true
    };
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSyncStatus();
    
    // Fallback polling a cada 2 minutos (reduzido de 30s -> -75% requisições)
    const interval = setInterval(fetchSyncStatus, FALLBACK_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);

  // Realtime para audit_logs (substituir parte do polling)
  useRealtimeTable({
    table: 'audit_logs',
    event: 'INSERT',
    filter: 'action=eq.SCHEDULED_SYNC_COMPLETED',
    onData: (payload) => {
      setStatus(prev => ({
        ...prev,
        lastSync: payload.new.created_at,
        isHealthy: true
      }));
      
      // Atualizar cache
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data: {
          ...status,
          lastSync: payload.new.created_at,
          isHealthy: true
        },
        timestamp: Date.now()
      }));
    }
  });

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
        ? new Date().getTime() - new Date(lastSyncLog.created_at).getTime() < 10 * 60 * 1000
        : false;

      const newStatus = {
        lastSync: lastSyncLog?.created_at || null,
        webhookEvents: webhookCount || 0,
        nextCronRun: nextRun.toISOString(),
        isHealthy
      };

      setStatus(newStatus);
      
      // Salvar no cache
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data: newStatus,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Erro ao buscar status de sincronização:', error);
    } finally {
      setLoading(false);
    }
  };

  // FASE 3: Validação periódica de wallets (a cada 6 horas)
  useEffect(() => {
    const validateWalletsJob = async () => {
      console.log('🔄 Iniciando validação periódica de wallets...');
      
      try {
        const { data: suppliers, error } = await supabase
          .from('suppliers')
          .select('id, name, asaas_wallet_id')
          .not('asaas_wallet_id', 'is', null)
          .eq('status', 'active');
        
        if (error) throw error;
        
        let invalidCount = 0;
        
        for (const supplier of suppliers || []) {
          try {
            const { data } = await supabase.functions.invoke('validate-asaas-wallet', {
              body: { supplierId: supplier.id, walletId: supplier.asaas_wallet_id }
            });
            
            if (!data?.valid) {
              invalidCount++;
              console.warn(`⚠️ Wallet inválida detectada: ${supplier.name} (${supplier.asaas_wallet_id})`);
              
              // Buscar admin para notificar
              const { data: adminProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'admin')
                .limit(1)
                .single();
              
              if (adminProfile) {
                // Criar notificação para admin
                await supabase.from('notifications').insert({
                  user_id: adminProfile.id,
                  title: 'Wallet Inválida Detectada',
                  message: `A wallet do fornecedor "${supplier.name}" está inválida e precisa ser recriada.`,
                  type: 'warning',
                  priority: 'high',
                  action_url: '/admin/suppliers',
                  metadata: {
                    supplier_id: supplier.id,
                    wallet_id: supplier.asaas_wallet_id,
                    reason: 'periodic_validation'
                  }
                });
              }
            }
          } catch (error) {
            console.error(`Erro ao validar wallet de ${supplier.name}:`, error);
          }
        }
        
        if (invalidCount > 0) {
          console.warn(`⚠️ ${invalidCount} wallets inválidas encontradas na validação periódica`);
        } else {
          console.log(`✅ Todas as ${suppliers?.length || 0} wallets estão válidas`);
        }
      } catch (error) {
        console.error('Erro na validação periódica de wallets:', error);
      }
    };
    
    // Executar após 1 minuto da montagem (para não sobrecarregar no load inicial)
    const initialTimeout = setTimeout(validateWalletsJob, 60000);
    
    // ✅ FASE 4: Repetir a cada 15 minutos (ao invés de 6 horas)
    const intervalId = setInterval(validateWalletsJob, 15 * 60 * 1000); // 15 minutos
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, []);

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

// Memoizar para evitar re-renders desnecessários
export const PaymentsSyncStatus = memo(PaymentsSyncStatusComponent);

