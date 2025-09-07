import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
  priority: 'low' | 'medium' | 'high';
  read?: boolean;
  category?: string;
  actionUrl?: string;
}

// Hook para notificações específicas do dashboard baseadas em dados reais
export function useDashboardNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} min atrás`;
    } else if (hours < 24) {
      return `${hours}h atrás`;
    } else {
      return `${days}d atrás`;
    }
  };

  // Função para obter notificações específicas do dashboard atual
  const generateDashboardNotifications = async (): Promise<DashboardNotification[]> => {
    if (!user?.role) return [];

    try {
      const generatedNotifications: DashboardNotification[] = [];
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (user.role) {
        case 'admin':
        case 'admin': {
          // Novos usuários hoje
          const { data: newUsersToday } = await supabase
            .from('profiles')
            .select('*')
            .gte('created_at', today.toISOString());

          // Novos clientes hoje
          const { data: newClientsToday } = await supabase
            .from('clients')
            .select('*')
            .gte('created_at', today.toISOString());

          if (newUsersToday && newUsersToday.length > 0) {
            generatedNotifications.push({
              id: 'dash-new-users',
              title: 'Novos cadastros hoje',
              message: `${newUsersToday.length} novos usuários${newClientsToday ? ` e ${newClientsToday.length} empresas` : ''} se cadastraram`,
              type: 'info',
              time: formatTimeAgo(today),
              priority: 'medium',
              category: 'usuarios',
              actionUrl: '/admin/users'
            });
          }

          // Tickets urgentes
          const { data: urgentTickets } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('priority', 'urgent')
            .in('status', ['novo', 'em_andamento']);

          if (urgentTickets && urgentTickets.length > 0) {
            generatedNotifications.push({
              id: 'dash-urgent-tickets',
              title: 'Tickets urgentes',
              message: `${urgentTickets.length} tickets marcados como urgentes precisam de atenção`,
              type: 'warning',
              time: 'Agora',
              priority: 'high',
              category: 'suporte',
              actionUrl: '/admin/communication'
            });
          }

          // Fornecedores pendentes
          const { data: pendingSuppliers } = await supabase
            .from('suppliers')
            .select('*')
            .eq('status', 'pending');

          if (pendingSuppliers && pendingSuppliers.length > 0) {
            generatedNotifications.push({
              id: 'dash-pending-suppliers',
              title: 'Fornecedores aguardando aprovação',
              message: `${pendingSuppliers.length} fornecedores precisam ser aprovados`,
              type: 'warning',
              time: formatTimeAgo(now),
              priority: 'medium',
              category: 'fornecedores',
              actionUrl: '/admin/suppliers'
            });
          }

          // Pagamentos falhados recentes
          const { data: failedPayments } = await supabase
            .from('payments')
            .select('*')
            .eq('status', 'failed')
            .gte('created_at', today.toISOString());

          if (failedPayments && failedPayments.length > 0) {
            generatedNotifications.push({
              id: 'dash-failed-payments',
              title: 'Pagamentos falhados hoje',
              message: `${failedPayments.length} pagamentos falharam e precisam ser revisados`,
              type: 'error',
              time: 'Hoje',
              priority: 'high',
              category: 'pagamentos',
              actionUrl: '/payments'
            });
          }

          break;
        }

        case 'manager': {
          // Cotações pendentes de aprovação para este cliente
          const userProfile = await supabase
            .from('profiles')
            .select('client_id')
            .eq('id', user.id)
            .single();

          if (userProfile.data?.client_id) {
            const { data: pendingApprovals } = await supabase
              .from('approvals')
              .select('*, quote_id')
              .eq('status', 'pending')
              .eq('approver_id', user.id);

            if (pendingApprovals && pendingApprovals.length > 0) {
              const urgentCount = pendingApprovals.filter(approval => {
                const createdAt = new Date(approval.created_at);
                const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
                return hoursDiff > 24; // Mais de 24h pendente
              }).length;

              generatedNotifications.push({
                id: 'dash-pending-approvals',
                title: 'Pendências de aprovação',
                message: `${pendingApprovals.length} cotações aguardam sua análise${urgentCount > 0 ? ` - ${urgentCount} urgentes` : ''}`,
                type: urgentCount > 0 ? 'warning' : 'info',
                time: 'Agora',
                priority: urgentCount > 0 ? 'high' : 'medium',
                category: 'aprovacoes',
                actionUrl: '/approvals'
              });
            }

            // Cotações aprovadas hoje pelo manager
            const { data: approvedToday } = await supabase
              .from('approvals')
              .select('*')
              .eq('approver_id', user.id)
              .eq('status', 'approved')
              .gte('approved_at', today.toISOString());

            if (approvedToday && approvedToday.length > 0) {
              generatedNotifications.push({
                id: 'dash-approved-today',
                title: 'Cotações aprovadas hoje',
                message: `Você aprovou ${approvedToday.length} cotações hoje`,
                type: 'success',
                time: 'Hoje',
                priority: 'medium',
                category: 'aprovacoes'
              });
            }
          }
          break;
        }

        case 'collaborator': {
          // Cotações criadas hoje pelo colaborador
          const { data: quotesToday } = await supabase
            .from('quotes')
            .select('*')
            .eq('created_by', user.id)
            .gte('created_at', today.toISOString());

          if (quotesToday && quotesToday.length > 0) {
            const pendingCount = quotesToday.filter(q => q.status === 'draft').length;
            const sentCount = quotesToday.filter(q => q.status === 'sent').length;

            generatedNotifications.push({
              id: 'dash-quotes-today',
              title: 'Suas cotações hoje',
              message: `Você criou ${quotesToday.length} cotações hoje${pendingCount > 0 ? ` - ${pendingCount} ainda em rascunho` : ''}`,
              type: pendingCount > 0 ? 'warning' : 'info',
              time: 'Hoje',
              priority: 'medium',
              category: 'cotacoes',
              actionUrl: '/quotes'
            });
          }

          // Cotações rejeitadas recentemente
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          const { data: rejectedQuotes } = await supabase
            .from('quotes')
            .select('*')
            .eq('created_by', user.id)
            .eq('status', 'rejected')
            .gte('updated_at', yesterday.toISOString());

          if (rejectedQuotes && rejectedQuotes.length > 0) {
            generatedNotifications.push({
              id: 'dash-rejected-quotes',
              title: 'Cotações rejeitadas',
              message: `${rejectedQuotes.length} cotação(ões) foram rejeitadas recentemente`,
              type: 'error',
              time: 'Recente',
              priority: 'high',
              category: 'cotacoes',
              actionUrl: '/quotes'
            });
          }
          break;
        }

        case 'supplier': {
          // Verificar se o usuário tem supplier_id
          if (!user.supplierId) break;
          
          // Cotações rejeitadas recentemente
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          // Novas oportunidades de cotação
          const { data: availableQuotes } = await supabase
            .from('quotes')
            .select('*')
            .in('status', ['sent', 'receiving'])
            .gte('created_at', today.toISOString());

          if (availableQuotes && availableQuotes.length > 0) {
            generatedNotifications.push({
              id: 'dash-opportunities',
              title: 'Oportunidades hoje',
              message: `${availableQuotes.length} novas solicitações de cotação disponíveis`,
              type: 'info',
              time: 'Hoje',
              priority: 'high',
              category: 'oportunidades',
              actionUrl: '/supplier/quotes'
            });
          }

          // Propostas aceitas recentemente
          const { data: acceptedProposals } = await supabase
            .from('quote_responses')
            .select('*')
            .eq('supplier_id', user.supplierId)
            .eq('status', 'accepted')
            .gte('created_at', yesterday.toISOString());

          if (acceptedProposals && acceptedProposals.length > 0) {
            const totalValue = acceptedProposals.reduce((sum, proposal) => 
              sum + (proposal.total_amount || 0), 0);

            generatedNotifications.push({
              id: 'dash-accepted-proposals',
              title: 'Propostas aceitas',
              message: `${acceptedProposals.length} proposta(s) aceitas no valor de R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              type: 'success',
              time: 'Recente',
              priority: 'medium',
              category: 'propostas'
            });
          }
          break;
        }
      }

      return generatedNotifications;
    } catch (error) {
      console.error('Erro ao gerar notificações do dashboard:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as notificações",
        variant: "destructive",
      });
      return [];
    }
  };

  useEffect(() => {
    if (user?.role) {
      const loadNotifications = async () => {
        setIsLoading(true);
        const dashboardNotifications = await generateDashboardNotifications();
        setNotifications(dashboardNotifications);
        setIsLoading(false);
      };

      loadNotifications();

      // Configurar realtime para atualizações
      const channel = supabase
        .channel('dashboard-notifications')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'quotes'
        }, () => {
          loadNotifications();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'approvals'
        }, () => {
          loadNotifications();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        }, () => {
          loadNotifications();
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        }, () => {
          loadNotifications();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.role, user?.id, user?.supplierId]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearDashboardNotifications: () => setNotifications([]),
    addDashboardNotification: (notification: DashboardNotification) => {
      setNotifications(prev => [notification, ...prev]);
    },
    refresh: async () => {
      setIsLoading(true);
      const dashboardNotifications = await generateDashboardNotifications();
      setNotifications(dashboardNotifications);
      setIsLoading(false);
    }
  };
}