import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Subscription {
  id: string;
  client_id: string;
  supplier_id?: string;
  plan_id: string;
  status: 'active' | 'suspended' | 'cancelled' | 'past_due';
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  trial_end?: string;
  cancel_at_period_end: boolean;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  subscription_id: string;
  client_id: string;
  supplier_id?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'past_due' | 'cancelled' | 'uncollectible';
  due_date: string;
  paid_at?: string;
  stripe_invoice_id?: string;
  payment_method?: 'stripe' | 'boleto' | 'pix' | 'manual';
  boleto_url?: string;
  boleto_barcode?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialSettings {
  id: string;
  days_before_suspension: number;
  days_grace_period: number;
  auto_suspend_enabled: boolean;
  auto_billing_enabled: boolean;
  reminder_intervals: number[];
  late_fee_percentage: number;
  stripe_webhook_secret?: string;
  boleto_provider: string;
  boleto_config: Record<string, any>;
  billing_day?: number;
  due_days?: number;
  default_billing_cycle?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  pastDueInvoices: number;
  totalInvoices: number;
  averageTicket: number;
  churnRate: number;
  growth: number;
}

export function useSupabaseFinancial() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<FinancialSettings | null>(null);
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeSubscriptions: 0,
    pastDueInvoices: 0,
    totalInvoices: 0,
    averageTicket: 0,
    churnRate: 0,
    growth: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Carregar assinaturas
  const loadSubscriptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions((data as Subscription[]) || []);
    } catch (error) {
      console.error('Erro ao carregar assinaturas:', error);
      toast.error('Erro ao carregar assinaturas');
    }
  }, []);

  // Carregar faturas
  const loadInvoices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices((data as Invoice[]) || []);
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
      toast.error('Erro ao carregar faturas');
    }
  }, []);

  // Carregar configurações
  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('financial_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data ? {
        ...data,
        reminder_intervals: Array.isArray(data.reminder_intervals) 
          ? data.reminder_intervals as number[]
          : [3, 7, 14]
      } as FinancialSettings : null);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações');
    }
  }, []);

  // Calcular métricas
  const calculateMetrics = useCallback(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);

    const monthlyRevenue = invoices
      .filter(inv => {
        const paidDate = inv.paid_at ? new Date(inv.paid_at) : null;
        return inv.status === 'paid' && 
               paidDate &&
               paidDate.getMonth() === currentMonth && 
               paidDate.getFullYear() === currentYear;
      })
      .reduce((sum, inv) => sum + inv.amount, 0);

    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length;
    const pastDueInvoices = invoices.filter(inv => inv.status === 'past_due').length;
    const totalInvoices = invoices.length;
    const averageTicket = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

    // Calcular crescimento (mock para agora)
    const growth = 15.2;
    const churnRate = 2.5;

    setMetrics({
      totalRevenue,
      monthlyRevenue,
      activeSubscriptions,
      pastDueInvoices,
      totalInvoices,
      averageTicket,
      churnRate,
      growth
    });
  }, [invoices, subscriptions]);

  // Suspender assinatura
  const suspendSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'suspended' })
        .eq('id', subscriptionId);

      if (error) throw error;
      toast.success('Assinatura suspensa com sucesso');
      await loadSubscriptions();
    } catch (error) {
      console.error('Erro ao suspender assinatura:', error);
      toast.error('Erro ao suspender assinatura');
    }
  };

  // Reativar assinatura
  const reactivateSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('id', subscriptionId);

      if (error) throw error;
      toast.success('Assinatura reativada com sucesso');
      await loadSubscriptions();
    } catch (error) {
      console.error('Erro ao reativar assinatura:', error);
      toast.error('Erro ao reativar assinatura');
    }
  };

  // Gerar fatura
  const generateInvoice = async (subscriptionId: string) => {
    try {
      // Buscar dados da assinatura
      const subscription = subscriptions.find(s => s.id === subscriptionId);
      if (!subscription) throw new Error('Assinatura não encontrada');

      // Buscar dados do plano
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', subscription.plan_id)
        .single();

      if (planError) throw planError;

      const amount = subscription.billing_cycle === 'monthly' 
        ? plan.monthly_price 
        : plan.yearly_price;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30 dias para vencimento

      const { error } = await supabase
        .from('invoices')
        .insert({
          subscription_id: subscriptionId,
          client_id: subscription.client_id,
          supplier_id: subscription.supplier_id,
          amount,
          currency: 'BRL',
          status: 'open',
          due_date: dueDate.toISOString()
        });

      if (error) throw error;
      toast.success('Fatura gerada com sucesso');
      await loadInvoices();
    } catch (error) {
      console.error('Erro ao gerar fatura:', error);
      toast.error('Erro ao gerar fatura');
    }
  };

  // Atualizar configurações
  const updateSettings = async (newSettings: Partial<FinancialSettings>) => {
    try {
      if (!settings) throw new Error('Configurações não carregadas');

      const { error } = await supabase
        .from('financial_settings')
        .update(newSettings)
        .eq('id', settings.id);

      if (error) throw error;
      toast.success('Configurações atualizadas com sucesso');
      await loadSettings();
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      toast.error('Erro ao atualizar configurações');
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        loadSubscriptions(),
        loadInvoices(),
        loadSettings()
      ]);
      setIsLoading(false);
    };

    loadData();
  }, [loadSubscriptions, loadInvoices, loadSettings]);

  // Recalcular métricas quando dados mudarem
  useEffect(() => {
    if (!isLoading) {
      calculateMetrics();
    }
  }, [subscriptions, invoices, isLoading, calculateMetrics]);

  return {
    subscriptions,
    invoices,
    settings,
    metrics,
    isLoading,
    suspendSubscription,
    reactivateSubscription,
    generateInvoice,
    updateSettings,
    loadSubscriptions,
    loadInvoices,
    loadSettings
  };
}