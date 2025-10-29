import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TermsAcceptanceData {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  terms_accepted: boolean;
  terms_accepted_at?: string;
  bypass_terms: boolean;
  accepted_version?: string;
  created_at: string;
}

export interface TermsAcceptanceStats {
  totalUsers: number;
  acceptedCount: number;
  pendingCount: number;
  bypassCount: number;
  acceptanceRate: number;
}

export interface TermsHistoryEntry {
  id: string;
  created_at: string;
  details: {
    terms_version?: string;
    terms_title?: string;
    [key: string]: any;
  };
}

export const useTermsAcceptance = () => {
  const [users, setUsers] = useState<TermsAcceptanceData[]>([]);
  const [stats, setStats] = useState<TermsAcceptanceStats>({
    totalUsers: 0,
    acceptedCount: 0,
    pendingCount: 0,
    bypassCount: 0,
    acceptanceRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Buscar usuários ativos
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, role, avatar_url, terms_accepted, terms_accepted_at, bypass_terms, created_at')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar última versão aceita de cada usuário via audit_logs
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('user_id, created_at, details')
        .eq('action', 'TERMS_ACCEPTED')
        .order('created_at', { ascending: false });

      if (auditError) throw auditError;

      // Mapear última versão por usuário
      const latestVersionMap = new Map<string, { version: string; date: string }>();
      auditLogs?.forEach((log) => {
        if (!latestVersionMap.has(log.user_id)) {
          const details = log.details as { terms_version?: string } | null;
          latestVersionMap.set(log.user_id, {
            version: details?.terms_version || 'N/A',
            date: log.created_at,
          });
        }
      });

      // Enriquecer dados dos usuários
      const enrichedUsers: TermsAcceptanceData[] = (profiles || []).map((profile) => {
        const versionData = latestVersionMap.get(profile.id);
        return {
          ...profile,
          accepted_version: versionData?.version,
        };
      });

      setUsers(enrichedUsers);

      // Calcular estatísticas
      const total = enrichedUsers.length;
      const accepted = enrichedUsers.filter((u) => u.terms_accepted).length;
      const pending = enrichedUsers.filter((u) => !u.terms_accepted && !u.bypass_terms).length;
      const bypass = enrichedUsers.filter((u) => u.bypass_terms).length;
      const rate = total > 0 ? (accepted / total) * 100 : 0;

      setStats({
        totalUsers: total,
        acceptedCount: accepted,
        pendingCount: pending,
        bypassCount: bypass,
        acceptanceRate: rate,
      });
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados de aceite.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserHistory = async (userId: string): Promise<TermsHistoryEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, created_at, details')
        .eq('user_id', userId)
        .eq('action', 'TERMS_ACCEPTED')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(entry => ({
        ...entry,
        details: entry.details as { terms_version?: string; terms_title?: string; [key: string]: any }
      }));
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico.',
        variant: 'destructive',
      });
      return [];
    }
  };

  const toggleBypass = async (userId: string, newValue: boolean): Promise<boolean> => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Usuário não autenticado');

      // Atualizar bypass
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ bypass_terms: newValue })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Criar log de auditoria
      const { error: auditError } = await supabase.from('audit_logs').insert({
        user_id: currentUser.id,
        action: newValue ? 'TERMS_BYPASS_ENABLED' : 'TERMS_BYPASS_DISABLED',
        entity_type: 'profiles',
        entity_id: userId,
        panel_type: 'admin',
        details: { bypass_enabled: newValue, target_user_id: userId },
      });

      if (auditError) console.error('Erro ao criar audit log:', auditError);

      toast({
        title: 'Sucesso',
        description: `Bypass ${newValue ? 'ativado' : 'desativado'} com sucesso.`,
      });

      // Atualizar lista local
      await fetchUsers();

      return true;
    } catch (error) {
      console.error('Erro ao alterar bypass:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o bypass.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const revokeAcceptance = async (userId: string): Promise<boolean> => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Usuário não autenticado');

      // Revogar aceite
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ terms_accepted: false, terms_accepted_at: null })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Criar log de auditoria
      const { error: auditError } = await supabase.from('audit_logs').insert({
        user_id: currentUser.id,
        action: 'TERMS_ACCEPTANCE_REVOKED',
        entity_type: 'profiles',
        entity_id: userId,
        panel_type: 'admin',
        details: { revoked_by: currentUser.id, target_user_id: userId },
      });

      if (auditError) console.error('Erro ao criar audit log:', auditError);

      toast({
        title: 'Sucesso',
        description: 'Aceite revogado. O usuário precisará aceitar novamente.',
      });

      // Atualizar lista local
      await fetchUsers();

      return true;
    } catch (error) {
      console.error('Erro ao revogar aceite:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível revogar o aceite.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const exportToCSV = (selectedUserIds?: string[]) => {
    try {
      const dataToExport = selectedUserIds
        ? users.filter((u) => selectedUserIds.includes(u.id))
        : users;

      // Cabeçalhos CSV
      const headers = [
        'ID',
        'Nome',
        'Email',
        'Papel',
        'Status Termo',
        'Data Aceite',
        'Versão Aceita',
        'Bypass Ativo',
        'Data Criação',
      ];

      // Linhas CSV
      const rows = dataToExport.map((u) => [
        u.id,
        u.name,
        u.email,
        u.role,
        u.terms_accepted ? 'Aceito' : 'Pendente',
        u.terms_accepted_at || 'N/A',
        u.accepted_version || 'N/A',
        u.bypass_terms ? 'Sim' : 'Não',
        u.created_at,
      ]);

      // Montar CSV
      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(',')
        ),
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `aceites-termos-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Sucesso',
        description: 'Relatório exportado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível exportar o relatório.',
        variant: 'destructive',
      });
    }
  };

  // Real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('terms-acceptance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    stats,
    loading,
    fetchUserHistory,
    toggleBypass,
    revokeAcceptance,
    exportToCSV,
    refetch: fetchUsers,
  };
};
