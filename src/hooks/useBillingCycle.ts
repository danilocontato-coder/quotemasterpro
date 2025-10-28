import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseCurrentClient } from './useSupabaseCurrentClient';

interface BillingCycleInfo {
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  daysUntilRenewal: number;
  billingAnchorDay: number;
  billingCycle: 'monthly' | 'yearly';
  isNearRenewal: boolean;
  subscriptionStatus: 'active' | 'past_due' | 'suspended' | 'cancelled';
}

export function useBillingCycle() {
  const { client } = useSupabaseCurrentClient();
  const [cycleInfo, setCycleInfo] = useState<BillingCycleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!client?.id) return;

    const fetchCycleInfo = async () => {
      try {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('current_period_start, current_period_end, billing_cycle, status')
          .eq('client_id', client.id)
          .in('status', ['active', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!subscription) {
          setCycleInfo(null);
          setIsLoading(false);
          return;
        }

        const periodStart = new Date(subscription.current_period_start);
        const periodEnd = new Date(subscription.current_period_end);
        const today = new Date();
        const daysUntilRenewal = Math.ceil((periodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        setCycleInfo({
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          nextBillingDate: periodEnd,
          daysUntilRenewal: Math.max(0, daysUntilRenewal),
          billingAnchorDay: periodStart.getDate(),
          billingCycle: subscription.billing_cycle as 'monthly' | 'yearly',
          isNearRenewal: daysUntilRenewal <= 7 && daysUntilRenewal > 0,
          subscriptionStatus: subscription.status as 'active' | 'past_due' | 'suspended' | 'cancelled'
        });
      } catch (error) {
        console.error('Erro ao buscar informações de ciclo:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCycleInfo();
  }, [client?.id]);

  return { cycleInfo, isLoading };
}
