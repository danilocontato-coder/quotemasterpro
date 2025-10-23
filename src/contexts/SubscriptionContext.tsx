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

  // Cache planos - executa apenas uma vez por sessão com validação de versão
  const fetchSubscriptionPlans = useCallback(async () => {
    setPlansLoading(true);
    const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
    const cached = sessionStorage.getItem('subscription_plans');
    const cacheTime = sessionStorage.getItem('subscription_plans_time');
    const cacheVersion = sessionStorage.getItem('subscription_plans_version');
    
    // ✅ Invalida cache se versão mudou
    if (cached && cacheTime && cacheVersion === APP_VERSION) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < 5 * 60 * 1000) { // ✅ Reduzir para 5 minutos
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
      sessionStorage.setItem('subscription_plans_version', APP_VERSION); // ✅ Salvar versão
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  // Cache usage com validação de versão
  const fetchClientUsage = useCallback(async () => {
    if (!currentClient?.id) {
      setIsLoading(false);
      return;
    }

    const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
    const cacheKey = `client_usage_${currentClient.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
    const cacheVersion = sessionStorage.getItem(`${cacheKey}_version`);
    
    // ✅ Invalida cache se versão mudou
    if (cached && cacheTime && cacheVersion === APP_VERSION) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < 30 * 1000) { // 30 segundos para atualização mais rápida
        setClientUsage(JSON.parse(cached));
        setIsLoading(false);
        return;
      }
    }

    try {
      // Reset mensal proativo antes de buscar dados
      console.log('[SubscriptionContext] Executando reset mensal proativo...');
      try {
        await supabase.rpc('reset_monthly_usage');
      } catch (err) {
        console.warn('[SubscriptionContext] Falha ao executar reset via RPC:', err);
      }
      
      // Buscar uso do cliente no banco
      const { data: usage, error } = await supabase
        .from('client_usage')
        .select('*')
        .eq('client_id', currentClient.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar uso do cliente:', error);
        return;
      }

      // Sempre buscar contagem real de usuários para garantir precisão
      const { count: realUsersCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', currentClient.id)
        .eq('status', 'active');

      if (!usage) {
        // Se não existe registro, criar um baseado em contagens reais
        const [quotesResponse, productsResponse] = await Promise.all([
          supabase
            .from('quotes')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', currentClient.id)
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          
          supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', currentClient.id)
        ]);

        const calculatedUsage: ClientUsage = {
          id: 'temp',
          client_id: currentClient.id,
          quotes_this_month: quotesResponse.count || 0,
          users_count: realUsersCount || 0,
          storage_used_gb: 0,
          quote_responses_this_month: 0,
          products_in_catalog: productsResponse.count || 0,
          categories_count: 0,
          last_reset_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };

        console.log('📊 [SubscriptionContext] Uso calculado:', calculatedUsage);
        setClientUsage(calculatedUsage);
        sessionStorage.setItem(cacheKey, JSON.stringify(calculatedUsage));
        sessionStorage.setItem(`${cacheKey}_version`, APP_VERSION);
      } else {
        // Fallback: verificar se last_reset_date está desatualizado
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const needsReset = usage.last_reset_date < firstDayOfMonth;
        
        if (needsReset) {
          console.log('[SubscriptionContext] last_reset_date desatualizado, recalculando localmente...');
          // Recalcular quotes_this_month localmente
          const { count: quotesCount } = await supabase
            .from('quotes')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', currentClient.id)
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
          
          usage.quotes_this_month = quotesCount || 0;
          usage.quote_responses_this_month = 0;
        }
        
        // Atualizar contagem de usuários com valor real
        const updatedUsage = {
          ...usage,
          users_count: realUsersCount || 0
        };
        
        console.log('📊 [SubscriptionContext] Uso do banco (atualizado):', updatedUsage);
        setClientUsage(updatedUsage);
        sessionStorage.setItem(cacheKey, JSON.stringify(updatedUsage));
        sessionStorage.setItem(`${cacheKey}_version`, APP_VERSION);
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

  // Realtime listeners para atualizar contadores automaticamente
  useEffect(() => {
    if (!currentClient?.id) return;

    console.log('[SubscriptionContext] Configurando listeners realtime...');
    
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quotes',
          filter: `client_id=eq.${currentClient.id}`
        },
        (payload) => {
          console.log('[SubscriptionContext] Realtime: nova cotação criada, atualizando uso...', payload);
          fetchClientUsage();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `client_id=eq.${currentClient.id}`
        },
        (payload) => {
          console.log('[SubscriptionContext] Realtime: mudança em usuários, atualizando uso...', payload);
          fetchClientUsage();
        }
      )
      .subscribe();

    return () => {
      console.log('[SubscriptionContext] Removendo listeners realtime...');
      supabase.removeChannel(channel);
    };
  }, [currentClient?.id, fetchClientUsage]);

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
        
        console.log('🔍 [SubscriptionContext] RPC get_current_user_plan resultado:', {
          data,
          hasStatus: 'status' in (data || {}),
          status: data?.status
        });
        
        setDbUserPlan(data || null);
      } catch (err) {
        console.error('Erro ao buscar plano atual via RPC:', err);
      }
    })();
  }, [user?.id]);

  const getPlanById = useCallback((planId: string) => {
    if (!planId) return undefined as any;
    const norm = String(planId).toLowerCase();
    
    const found = (
      subscriptionPlans.find(p => p.id === planId) ||
      subscriptionPlans.find(p => (p.id || '').toLowerCase() === norm) ||
      subscriptionPlans.find(p => (p.name || '').toLowerCase() === norm) ||
      subscriptionPlans.find(p => (p.display_name || '').toLowerCase() === norm) ||
      subscriptionPlans.find(p => (p.name || '').toLowerCase() === norm.replace(/^plan-/, '')) ||
      subscriptionPlans.find(p => (p.id || '').toLowerCase() === `plan-${norm}`)
    );
    
    console.log('🔍 [getPlanById]:', {
      searchPlanId: planId,
      foundPlan: found?.id,
      foundStatus: found?.status,
      totalPlans: subscriptionPlans.length
    });
    
    return found;
  }, [subscriptionPlans]);

  const checkLimit = useCallback((action: string, additionalCount: number = 1): LimitCheckResult => {
    // ⚠️ Durante carregamento inicial, ser permissivo
    if (!user || !currentClient || !clientUsage || plansLoading) {
      return { allowed: true, currentUsage: 0, limit: -1 };
    }

    const planId = currentClient.subscription_plan_id || 'basic';
    const plan = getPlanById(planId) || dbUserPlan;
    
    console.log('🔍 [checkLimit] Debug:', {
      action,
      planId,
      planFound: !!plan,
      planStatus: plan?.status,
      planHasStatus: plan && 'status' in plan,
      subscriptionPlansCount: subscriptionPlans.length,
      dbUserPlanId: dbUserPlan?.id,
      dbUserPlanStatus: dbUserPlan?.status,
      plansLoading
    });
    
    // Se não encontrou plano mas planos ainda não carregaram, ser permissivo
    if (!plan && plansLoading) {
      console.warn('⚠️ [checkLimit] Planos ainda carregando, permitindo ação temporariamente');
      return { allowed: true, currentUsage: 0, limit: -1 };
    }
    
    if (!plan) {
      console.error('❌ [checkLimit] Plano não encontrado após carregamento:', {
        planId,
        availablePlans: subscriptionPlans.map(p => p.id)
      });
      return { allowed: true, currentUsage: 0, limit: -1 };
    }

    // ⚠️ CRÍTICO: Bloquear ações se o plano está inativo
    // Verificar explicitamente o status
    const isActive = plan.status === 'active';
    
    if (!isActive) {
      console.error('❌ [checkLimit] Plano inativo:', {
        planId: plan.id,
        planStatus: plan.status,
        planName: plan.name || plan.display_name
      });
      return {
        allowed: false,
        reason: `Plano "${plan.display_name || plan.name}" está inativo. Entre em contato com o suporte.`,
        currentUsage: 0,
        limit: 0,
        upgradeRequired: true
      };
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
  }, [user, currentClient, clientUsage, getPlanById, plansLoading, subscriptionPlans, dbUserPlan]);

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
    
    // Limpar cache de planos também para forçar atualização completa
    sessionStorage.removeItem('subscription_plans');
    sessionStorage.removeItem('subscription_plans_time');
    
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

    // ⚡ OTIMIZAÇÃO: Não logar se ainda estiver carregando cliente
    if (!currentClient || clientLoading) {
      return undefined;
    }

    const planId = currentClient?.subscription_plan_id || '';
    
    // ⚡ OTIMIZAÇÃO: Só logar warning uma vez (não repetir a cada render)
    if (!planId) {
      if (!sessionStorage.getItem('logged_no_plan_id')) {
        console.warn('⚠️ [SubscriptionContext] Sem plan_id no cliente:', {
          planId,
          clientId: currentClient?.id
        });
        sessionStorage.setItem('logged_no_plan_id', 'true');
      }
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
  }, [dbUserPlan, currentClient?.subscription_plan_id, clientLoading, getPlanById, subscriptionPlans, plansLoading]);

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
