import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Client = Database['public']['Tables']['clients']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

// Partial Quote para exibição no modal (campos essenciais)
interface QuoteListItem {
  id: string;
  local_code: string | null;
  title: string;
  description: string | null;
  status: string;
  total: number;
  items_count: number;
  created_at: string;
  client_id: string;
  on_behalf_of_client_id: string | null;
}

export interface CondominioDetail {
  condominio: Client | null;
  quotes: QuoteListItem[];
  users: Profile[];
  auditLogs: AuditLog[];
  metrics: {
    totalQuotes: number;
    activeQuotes: number;
    totalSpent: number;
    activeUsers: number;
  };
}

export function useCondominioDetail(condominioId: string | null) {
  const [data, setData] = useState<CondominioDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!condominioId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Buscar condomínio
      const { data: condominio, error: condoError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', condominioId)
        .single();

      if (condoError) throw condoError;

      // Buscar cotações (incluindo on_behalf_of_client_id)
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id, local_code, title, description, status, total, items_count, created_at, client_id, on_behalf_of_client_id')
        .or(`client_id.eq.${condominioId},on_behalf_of_client_id.eq.${condominioId}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (quotesError) throw quotesError;

      // Buscar usuários
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('client_id', condominioId)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Buscar histórico (audit logs)
      const { data: auditLogs, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .contains('details', { client_id: condominioId })
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsError) throw logsError;

      // Calcular métricas
      const totalQuotes = quotes?.length || 0;
      const activeQuotes = quotes?.filter(q => 
        ['sent', 'receiving', 'under_review'].includes(q.status)
      ).length || 0;
      const totalSpent = quotes
        ?.filter(q => ['approved', 'paid'].includes(q.status))
        .reduce((sum, q) => sum + (Number(q.total) || 0), 0) || 0;
      const activeUsers = users?.filter(u => u.active).length || 0;

      setData({
        condominio,
        quotes: quotes || [],
        users: users || [],
        auditLogs: auditLogs || [],
        metrics: {
          totalQuotes,
          activeQuotes,
          totalSpent,
          activeUsers,
        },
      });
    } catch (err: any) {
      console.error('Error fetching condominio detail:', err);
      setError(err.message || 'Erro ao carregar detalhes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [condominioId]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchDetail,
  };
}
