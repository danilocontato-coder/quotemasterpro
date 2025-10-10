import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ContractAlert = Database['public']['Tables']['contract_alerts']['Row'];

export const useContractAlerts = () => {
  const [alerts, setAlerts] = useState<ContractAlert[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('contract_alerts')
        .select('*, contracts(title)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const alertsData = data || [];
      setAlerts(alertsData);
      
      const pending = alertsData.filter(a => a.status === 'pendente').length;
      const critical = alertsData.filter(a => a.severity === 'critical' && a.status === 'pendente').length;
      
      setPendingCount(pending);
      setCriticalCount(critical);
    } catch (error: any) {
      console.error('Error fetching alerts:', error);
      toast({
        title: 'Erro ao carregar alertas',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('contract_alerts')
        .update({
          status: 'resolvido',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: 'Alerta resolvido',
        description: 'Alerta marcado como resolvido'
      });

      fetchAlerts();
    } catch (error: any) {
      console.error('Error resolving alert:', error);
      toast({
        title: 'Erro ao resolver alerta',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const ignoreAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('contract_alerts')
        .update({ status: 'ignorado' })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: 'Alerta ignorado',
        description: 'Alerta marcado como ignorado'
      });

      fetchAlerts();
    } catch (error: any) {
      console.error('Error ignoring alert:', error);
      toast({
        title: 'Erro ao ignorar alerta',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel('contract_alerts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contract_alerts' },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    alerts,
    pendingCount,
    criticalCount,
    isLoading,
    resolveAlert,
    ignoreAlert,
    refreshAlerts: fetchAlerts
  };
};
