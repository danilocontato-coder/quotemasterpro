import { useState, useEffect, useMemo, useCallback } from 'react';
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

export function useSupabaseSubscriptionGuard() {
  const { user } = useAuth();
  const { client: currentClient, isLoading: clientLoading } = useSupabaseCurrentClient();
  const [clientUsage, setClientUsage] = useState<ClientUsage | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cache planos por 5 minutos para evitar chamadas desnecessárias
  const fetchSubscriptionPlans = useCallback(async () => {
    const cached = sessionStorage.getItem('subscription_plans');
    const cacheTime = sessionStorage.getItem('subscription_plans_time');
    
    if (cached && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < 5 * 60 * 1000) { // 5 minutos
        setSubscriptionPlans(JSON.parse(cached));
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('Erro ao buscar planos:', error);
        return;
      }

      setSubscriptionPlans(data || []);
      sessionStorage.setItem('subscription_plans', JSON.stringify(data || []));
      sessionStorage.setItem('subscription_plans_time', Date.now().toString());
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    }
  }, []);

  useEffect(() => {
    if (!subscriptionPlans.length) {
      fetchSubscriptionPlans();
    }
  }, [fetchSubscriptionPlans, subscriptionPlans.length]);

  // Cache usage por 2 minutos
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
      if (age < 2 * 60 * 1000) { // 2 minutos
        setClientUsage(JSON.parse(cached));
        setIsLoading(false);
        return;
      }
    }

    try {
      setIsLoading(true);

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
    if (currentClient && !clientLoading && !clientUsage) {
      fetchClientUsage();
    }
  }, [currentClient, clientLoading, clientUsage, fetchClientUsage]);

  // getPlanById usando useMemo para evitar recálculo
  const getPlanById = useCallback((planId: string) => {
    return subscriptionPlans.find(p => p.id === planId);
  }, [subscriptionPlans]);

  const checkLimit = useCallback((action: string, additionalCount: number = 1): LimitCheckResult => {
    if (!user || !currentClient || !clientUsage) {
      return { allowed: false, reason: 'Dados não carregados', currentUsage: 0, limit: 0 };
    }

    const planId = currentClient.subscription_plan_id || 'basic';
    const userPlan = getPlanById(planId);
    
    if (!userPlan) {
      return { allowed: false, reason: 'Plano não encontrado', currentUsage: 0, limit: 0 };
    }

    switch (action) {
      case 'CREATE_QUOTE':
        const maxQuotes = userPlan?.max_quotes_per_month || 0;
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

      case 'ADD_SUPPLIER_TO_QUOTE':
      case 'UPLOAD_FILE':
        // Sempre permitido para ações básicas
        return {
          allowed: true,
          currentUsage: 0,
          limit: -1
        };

      default:
        return {
          allowed: true,
          currentUsage: 0,
          limit: -1
        };
    }
  }, [user, currentClient, clientUsage, getPlanById]);

  const showUpgradeToast = useCallback((result: LimitCheckResult) => {
    if (result.upgradeRequired) {
      toast.error(result.reason || 'Limite atingido', {
        description: 'Considere fazer upgrade do seu plano para continuar usando todos os recursos.',
        action: {
          label: 'Ver Planos',
          onClick: () => {
            window.location.href = '/admin/plans';
          }
        }
      });
    }
  }, []);

  const enforceLimit = useCallback((action: string, additionalCount: number = 1): boolean => {
    const result = checkLimit(action, additionalCount);
    
    if (!result.allowed) {
      showUpgradeToast(result);
      return false;
    }
    
    return true;
  }, [checkLimit, showUpgradeToast]);

  const getUsagePercentage = useCallback((action: string): number => {
    const result = checkLimit(action, 0);
    
    if (result.limit === -1) return 0; // Unlimited
    if (result.limit === 0) return 100;
    
    return Math.round((result.currentUsage / result.limit) * 100);
  }, [checkLimit]);

  const isNearLimit = useCallback((action: string, threshold: number = 80): boolean => {
    return getUsagePercentage(action) >= threshold;
  }, [getUsagePercentage]);

  const refreshUsage = useCallback(async () => {
    if (!currentClient?.id) return;

    try {
      const { data, error } = await supabase
        .from('client_usage')
        .select('*')
        .eq('client_id', currentClient.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao recarregar uso:', error);
        return;
      }

      if (data) {
        setClientUsage(data);
      }
    } catch (error) {
      console.error('Erro ao recarregar dados de uso:', error);
    }
  }, [currentClient?.id]);

  const getCurrentUsage = useCallback(() => {
    if (!clientUsage) {
      return {
        quotesThisMonth: 0,
        usersCount: 0,
        suppliersPerQuote: 0,
        storageUsedGB: 0,
        quoteResponsesThisMonth: 0,
        productsInCatalog: 0,
        categoriesCount: 0
      };
    }

    return {
      quotesThisMonth: clientUsage.quotes_this_month,
      usersCount: clientUsage.users_count,
      suppliersPerQuote: 0, // Calculado por cotação
      storageUsedGB: clientUsage.storage_used_gb,
      quoteResponsesThisMonth: clientUsage.quote_responses_this_month,
      productsInCatalog: clientUsage.products_in_catalog,
      categoriesCount: clientUsage.categories_count
    };
  }, [clientUsage]);

  // userPlan usando useMemo para evitar recálculo infinito
  const userPlan = useMemo(() => {
    const planId = currentClient?.subscription_plan_id || 'basic';
    return getPlanById(planId);
  }, [currentClient?.subscription_plan_id, getPlanById]);

  return {
    currentUsage: getCurrentUsage(),
    clientUsage,
    isLoading,
    checkLimit,
    enforceLimit,
    showUpgradeToast,
    getUsagePercentage,
    isNearLimit,
    refreshUsage,
    userPlan
  };
}