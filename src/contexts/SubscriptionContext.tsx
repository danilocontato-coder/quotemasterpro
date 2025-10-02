import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseCurrentClient } from '@/hooks/useSupabaseCurrentClient';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClientUsage {
  id: string;
  client_id: string;
  quotes_this_month: number;
  users_count: number;
  storage_used_gb: number;
  quote_responses_this_month: number;
  products_in_catalog: number;
  categories_count: number;
  last_reset_date: string;
  updated_at: string;
  created_at: string;
}

interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  upgradeRequired?: boolean;
}

interface SubscriptionContextType {
  currentUsage: any;
  clientUsage: ClientUsage | null;
  isLoading: boolean;
  checkLimit: (action: string, additionalCount?: number) => LimitCheckResult;
  enforceLimit: (action: string, additionalCount?: number) => boolean;
  getUsagePercentage: (action: string) => number;
  isNearLimit: (action: string, threshold?: number) => boolean;
  refreshUsage: () => Promise<void>;
  userPlan: any;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { client: currentClient, isLoading: clientLoading } = useSupabaseCurrentClient();
  const [clientUsage, setClientUsage] = useState<ClientUsage | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [dbUserPlan, setDbUserPlan] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cache planos - executa apenas uma vez por sessão
  const fetchSubscriptionPlans = useCallback(async () => {
    setPlansLoading(true);
    const cached = sessionStorage.getItem('subscription_plans');
    const cacheTime = sessionStorage.getItem('subscription_plans_time');
    
    if (cached && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < 10 * 60 * 1000) { // 10 minutos
        setSubscriptionPlans(JSON.parse(cached));
        setPlansLoading(false);
        return;
      }
    }

    try {
      // Buscar todos os planos (sem filtro de status) para garantir que o plano do usuário seja encontrado
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*');

      if (error) throw error;

      setSubscriptionPlans(data || []);
      sessionStorage.setItem('subscription_plans', JSON.stringify(data || []));
      sessionStorage.setItem('subscription_plans_time', Date.now().toString());
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  // Cache usage
  const fetchClientUsage = useCallback(async () => {
    if (!currentClient?.id) {
      setIsLoading(false);
      return;
    }

    const cacheKey = `client_usage_${currentClient.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
    
    if (cached && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < 5 * 60 * 1000) { // 5 minutos
        setClientUsage(JSON.parse(cached));
        setIsLoading(false);
        return;
      }
    }

    try {
      const { data: usage, error } = await supabase
        .from('client_usage')
        .select('*')
        .eq('client_id', currentClient.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar uso do cliente:', error);
        return;
      }

      if (!usage) {
        const [quotesResponse, usersResponse] = await Promise.all([
          supabase
            .from('quotes')
            .select('id', { count: 'exact' })
            .eq('client_id', currentClient.id)
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          
          supabase
            .from('users')
            .select('id', { count: 'exact' })
            .eq('client_id', currentClient.id)
            .eq('status', 'active')
        ]);

        const mockUsage: ClientUsage = {
          id: 'temp',
          client_id: currentClient.id,
          quotes_this_month: quotesResponse.count || 0,
          users_count: usersResponse.count || 0,
          storage_used_gb: Math.random() * 2,
          quote_responses_this_month: 0,
          products_in_catalog: 0,
          categories_count: 0,
          last_reset_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };

        setClientUsage(mockUsage);
        sessionStorage.setItem(cacheKey, JSON.stringify(mockUsage));
      } else {
        setClientUsage(usage);
        sessionStorage.setItem(cacheKey, JSON.stringify(usage));
      }
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
    } catch (error) {
      console.error('Erro ao carregar dados de uso:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentClient?.id]);

  useEffect(() => {
    fetchSubscriptionPlans();
  }, [fetchSubscriptionPlans]);

  useEffect(() => {
    if (currentClient && !clientLoading) {
      fetchClientUsage();
    }
  }, [currentClient?.id, clientLoading, fetchClientUsage]);

  // Buscar plano atual do usuário via RPC (retorna mesmo se inativo)
  useEffect(() => {
    if (!user) {
      setDbUserPlan(null);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_current_user_plan');
        if (error) throw error;
        setDbUserPlan(data || null);
      } catch (err) {
        console.error('Erro ao buscar plano atual via RPC:', err);
      }
    })();
  }, [user?.id]);

  const getPlanById = useCallback((planId: string) => {
    if (!planId) return undefined as any;
    const norm = String(planId).toLowerCase();
    return (
      subscriptionPlans.find(p => p.id === planId) ||
      subscriptionPlans.find(p => (p.id || '').toLowerCase() === norm) ||
      subscriptionPlans.find(p => (p.name || '').toLowerCase() === norm) ||
      subscriptionPlans.find(p => (p.display_name || '').toLowerCase() === norm) ||
      subscriptionPlans.find(p => (p.name || '').toLowerCase() === norm.replace(/^plan-/, '')) ||
      subscriptionPlans.find(p => (p.id || '').toLowerCase() === `plan-${norm}`)
    );
  }, [subscriptionPlans]);

  const checkLimit = useCallback((action: string, additionalCount: number = 1): LimitCheckResult => {
    if (!user || !currentClient || !clientUsage) {
      return { allowed: true, currentUsage: 0, limit: -1 }; // Permissivo durante carregamento
    }

    const planId = currentClient.subscription_plan_id || 'basic';
    const plan = getPlanById(planId) || dbUserPlan;
    
    if (!plan) {
      return { allowed: true, currentUsage: 0, limit: -1 };
    }

    switch (action) {
      case 'CREATE_QUOTE':
        const maxQuotes = plan?.max_quotes_per_month || plan?.max_quotes || 0;
        const currentQuotes = clientUsage.quotes_this_month;
        
        return {
          allowed: currentQuotes < maxQuotes,
          reason: currentQuotes >= maxQuotes ? `Limite de ${maxQuotes} cotações por mês atingido` : undefined,
          currentUsage: currentQuotes,
          limit: maxQuotes,
          upgradeRequired: currentQuotes >= maxQuotes
        };

      case 'ADD_USER':
      case 'CREATE_USER':
        const maxUsers = userPlan?.max_users_per_client || 0;
        const currentUsers = clientUsage.users_count;
        
        return {
          allowed: currentUsers < maxUsers,
          reason: currentUsers >= maxUsers ? `Limite de ${maxUsers} usuários por cliente atingido` : undefined,
          currentUsage: currentUsers,
          limit: maxUsers,
          upgradeRequired: currentUsers >= maxUsers
        };

      default:
        return {
          allowed: true,
          currentUsage: 0,
          limit: -1
        };
    }
  }, [user, currentClient, clientUsage, getPlanById]);

  const enforceLimit = useCallback((action: string, additionalCount: number = 1): boolean => {
    const result = checkLimit(action, additionalCount);
    
    if (!result.allowed && result.upgradeRequired) {
      toast.error(result.reason || 'Limite atingido', {
        description: 'Considere fazer upgrade do seu plano.',
        action: {
          label: 'Ver Planos',
          onClick: () => window.dispatchEvent(new CustomEvent('navigate-to', { detail: '/admin/plans' }))
        }
      });
      return false;
    }
    
    return true;
  }, [checkLimit]);

  const getUsagePercentage = useCallback((action: string): number => {
    const result = checkLimit(action, 0);
    if (result.limit === -1 || result.limit === 0) return 0;
    return Math.round((result.currentUsage / result.limit) * 100);
  }, [checkLimit]);

  const isNearLimit = useCallback((action: string, threshold: number = 80): boolean => {
    return getUsagePercentage(action) >= threshold;
  }, [getUsagePercentage]);

  const refreshUsage = useCallback(async () => {
    if (!currentClient?.id) return;
    const cacheKey = `client_usage_${currentClient.id}`;
    sessionStorage.removeItem(cacheKey);
    sessionStorage.removeItem(`${cacheKey}_time`);
    await fetchClientUsage();
  }, [currentClient?.id, fetchClientUsage]);

  const getCurrentUsage = useCallback(() => {
    if (!clientUsage) {
      return {
        quotesThisMonth: 0,
        usersCount: 0,
        storageUsedGB: 0,
        quoteResponsesThisMonth: 0,
        productsInCatalog: 0,
        categoriesCount: 0
      };
    }

    return {
      quotesThisMonth: clientUsage.quotes_this_month,
      usersCount: clientUsage.users_count,
      storageUsedGB: clientUsage.storage_used_gb,
      quoteResponsesThisMonth: clientUsage.quote_responses_this_month,
      productsInCatalog: clientUsage.products_in_catalog,
      categoriesCount: clientUsage.categories_count
    };
  }, [clientUsage]);

  const userPlan = useMemo(() => {
    // Se temos um plano via RPC, usar esse primeiro
    if (dbUserPlan) {
      console.log('✅ [SubscriptionContext] Plano via RPC:', {
        id: dbUserPlan.id,
        name: dbUserPlan.name,
        display_name: dbUserPlan.display_name,
        enabled_modules: dbUserPlan.enabled_modules
      });
      return dbUserPlan;
    }

    const planId = currentClient?.subscription_plan_id || '';
    
    if (!planId) {
      console.warn('⚠️ [SubscriptionContext] Sem plan_id no cliente:', {
        planId,
        clientId: currentClient?.id
      });
      return undefined;
    }

    if (plansLoading || subscriptionPlans.length === 0) {
      console.warn('⚠️ [SubscriptionContext] Planos ainda não carregados:', {
        planId,
        plansLoading,
        plansCount: subscriptionPlans.length,
        clientId: currentClient?.id
      });
      return undefined;
    }

    let foundPlan = getPlanById(planId);

    if (!foundPlan) {
      const norm = planId.toLowerCase();
      foundPlan = subscriptionPlans.find(p => 
        (p.name || '').toLowerCase() === norm ||
        (p.name || '').toLowerCase() === norm.replace(/^plan-/, '') ||
        (p.display_name || '').toLowerCase() === norm
      );
    }

    if (!foundPlan) {
      console.error('❌ [SubscriptionContext] Plano não encontrado:', {
        planId,
        availablePlans: subscriptionPlans.map(p => ({ id: p.id, name: p.name }))
      });
    } else {
      console.log('✅ [SubscriptionContext] Plano encontrado:', {
        id: foundPlan.id,
        name: foundPlan.name,
        display_name: foundPlan.display_name,
        enabled_modules: foundPlan.enabled_modules
      });
    }

    return foundPlan;
  }, [dbUserPlan, currentClient?.subscription_plan_id, getPlanById, subscriptionPlans, plansLoading]);

  const value = useMemo(() => ({
    currentUsage: getCurrentUsage(),
    clientUsage,
    isLoading,
    checkLimit,
    enforceLimit,
    getUsagePercentage,
    isNearLimit,
    refreshUsage,
    userPlan
  }), [
    getCurrentUsage,
    clientUsage,
    isLoading,
    checkLimit,
    enforceLimit,
    getUsagePercentage,
    isNearLimit,
    refreshUsage,
    userPlan
  ]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    // Retornar valores padrão seguros ao invés de erro
    console.warn('⚠️ useSubscription: Context não disponível, retornando valores padrão');
    return {
      currentUsage: {
        quotesThisMonth: 0,
        usersCount: 0,
        storageUsedGB: 0,
        quoteResponsesThisMonth: 0,
        productsInCatalog: 0,
        categoriesCount: 0
      },
      clientUsage: null,
      isLoading: true,
      checkLimit: () => ({ allowed: true, currentUsage: 0, limit: -1 }),
      enforceLimit: () => true,
      getUsagePercentage: () => 0,
      isNearLimit: () => false,
      refreshUsage: async () => {},
      userPlan: undefined
    } as SubscriptionContextType;
  }
  return context;
}
