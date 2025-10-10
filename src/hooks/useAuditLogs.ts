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

export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: 50,
    totalRecords: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const fetchLogs = useCallback(async (filters?: {
    searchTerm?: string;
    module?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const page = filters?.page || 1;
      const pageSize = filters?.pageSize || 50;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Query para contagem total (sem paginação)
      let countQuery = supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });

      // Query para dados (com paginação)
      let dataQuery = supabase
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
        .order('created_at', { ascending: false })
        .range(from, to);

      // Aplicar os mesmos filtros em ambas as queries
      if (filters?.module && filters.module !== 'all') {
        countQuery = countQuery.eq('entity_type', filters.module);
        dataQuery = dataQuery.eq('entity_type', filters.module);
      }

      if (filters?.action && filters.action !== 'all') {
        countQuery = countQuery.eq('action', filters.action);
        dataQuery = dataQuery.eq('action', filters.action);
      }

      if (filters?.userId && filters.userId !== 'all') {
        countQuery = countQuery.eq('user_id', filters.userId);
        dataQuery = dataQuery.eq('user_id', filters.userId);
      }

      if (filters?.startDate) {
        countQuery = countQuery.gte('created_at', filters.startDate);
        dataQuery = dataQuery.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        countQuery = countQuery.lte('created_at', filters.endDate);
        dataQuery = dataQuery.lte('created_at', filters.endDate);
      }

      // Executar ambas as queries
      const [{ count }, { data, error: fetchError }] = await Promise.all([
        countQuery,
        dataQuery
      ]);

      if (fetchError) throw fetchError;

      const totalRecords = count || 0;
      const totalPages = Math.ceil(totalRecords / pageSize);

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
      setPagination({
        currentPage: page,
        pageSize,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      });
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
    pagination,
    fetchLogs,
    exportLogs,
  };
}
