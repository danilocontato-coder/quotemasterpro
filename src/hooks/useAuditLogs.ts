import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  panel_type: string | null;
  details: any;
  created_at: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
}

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async (filters?: {
    searchTerm?: string;
    module?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          panel_type,
          details,
          created_at,
          user_id,
          profiles:user_id (
            name,
            email,
            role
          )
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters?.module && filters.module !== 'all') {
        query = query.eq('entity_type', filters.module);
      }

      if (filters?.action && filters.action !== 'all') {
        query = query.eq('action', filters.action);
      }

      if (filters?.userId && filters.userId !== 'all') {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const formattedLogs: AuditLog[] = (data || []).map((log: any) => ({
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        panel_type: log.panel_type,
        details: log.details,
        created_at: log.created_at,
        user_id: log.user_id,
        user_name: log.profiles?.name || 'Sistema',
        user_email: log.profiles?.email || null,
        user_role: log.profiles?.role || null,
      }));

      setLogs(formattedLogs);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError(err.message);
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exportLogs = useCallback(async (format: 'csv' | 'json' = 'csv') => {
    try {
      if (format === 'csv') {
        const csvContent = [
          ['Data/Hora', 'Usuário', 'Email', 'Papel', 'Ação', 'Módulo', 'ID Entidade', 'Detalhes'].join(','),
          ...logs.map(log => [
            new Date(log.created_at).toLocaleString('pt-BR'),
            log.user_name || 'Sistema',
            log.user_email || '',
            log.user_role || '',
            log.action,
            log.entity_type,
            log.entity_id,
            JSON.stringify(log.details || {}).replace(/,/g, ';')
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
      } else {
        const jsonContent = JSON.stringify(logs, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
      }

      toast.success('Logs exportados com sucesso!');
    } catch (err) {
      console.error('Error exporting logs:', err);
      toast.error('Erro ao exportar logs');
    }
  }, [logs]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    isLoading,
    error,
    fetchLogs,
    exportLogs,
  };
}
