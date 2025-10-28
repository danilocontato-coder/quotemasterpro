import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseCurrentClient } from './useSupabaseCurrentClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface SubscriptionStatus {
  isActive: boolean;
  isSuspended: boolean;
  isPastDue: boolean;
  status: string;
  daysOverdue?: number;
}

export function useSubscriptionStatus() {
  const { client } = useSupabaseCurrentClient();
  const navigate = useNavigate();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!client?.id) return;

    const checkStatus = async () => {
      try {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status, current_period_end')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!subscription) {
          setStatus({ isActive: false, isSuspended: false, isPastDue: false, status: 'none' });
          setIsLoading(false);
          return;
        }

        const periodEnd = new Date(subscription.current_period_end);
        const today = new Date();
        const daysOverdue = Math.ceil((today.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24));

        setStatus({
          isActive: subscription.status === 'active',
          isSuspended: subscription.status === 'suspended',
          isPastDue: subscription.status === 'past_due',
          status: subscription.status,
          daysOverdue: daysOverdue > 0 ? daysOverdue : undefined
        });
      } catch (error) {
        console.error('Erro ao verificar status da assinatura:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();

    const channel = supabase
      .channel('subscription-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'subscriptions',
          filter: `client_id=eq.${client.id}`
        },
        () => {
          checkStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [client?.id]);

  const enforceActiveSubscription = (action: string = 'esta ação') => {
    if (!status) return true;

    if (status.isSuspended) {
      toast.error('Conta Suspensa', {
        description: 'Sua assinatura foi suspensa por falta de pagamento. Regularize para continuar usando o sistema.',
        action: {
          label: 'Ver Faturas',
          onClick: () => navigate('/billing')
        }
      });
      return false;
    }

    if (status.isPastDue) {
      toast.warning('Pagamento Atrasado', {
        description: `Seu pagamento está ${status.daysOverdue} dia(s) atrasado. Regularize para evitar suspensão.`,
        action: {
          label: 'Ver Faturas',
          onClick: () => navigate('/billing')
        }
      });
      return true;
    }

    return true;
  };

  return {
    status,
    isLoading,
    enforceActiveSubscription
  };
}
