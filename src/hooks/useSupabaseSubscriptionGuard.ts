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

  // Fetch planos apenas uma vez
  const fetchSubscriptionPlans = useCallback(async () => {
    try {
      console.log('📦 DEBUG: Buscando planos do Supabase...');
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('❌ DEBUG: Erro ao buscar planos:', error);
        return;
      }

      console.log('📦 DEBUG: Planos encontrados:', data);
      setSubscriptionPlans(data || []);
    } catch (error) {
      console.error('❌ DEBUG: Erro ao carregar planos:', error);
    }
  }, []); // Dependências vazias intencionalmente

  useEffect(() => {
    fetchSubscriptionPlans();
  }, []); // Executa apenas uma vez

  // Fetch client usage controlado
  const fetchClientUsage = useCallback(async () => {
    if (!currentClient?.id) {
      console.log('⚠️ DEBUG: Sem cliente atual, encerrando');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      console.log('📊 DEBUG: Buscando client_usage para:', currentClient.id);
      // Buscar uso atual do cliente
      const { data: usage, error } = await supabase
        .from('client_usage')
        .select('*')
        .eq('client_id', currentClient.id)
        .maybeSingle();

      console.log('📊 DEBUG: Resultado da busca client_usage:', { usage, error });

      if (error && error.code !== 'PGRST116') {
        console.error('❌ DEBUG: Erro ao carregar uso do cliente:', error);
        return;
      }

      if (!usage) {
        console.log('🔧 DEBUG: Usage não existe, calculando baseado em tabelas');
        // Se não existe registro, buscar dados contando as tabelas
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

        console.log('🔢 DEBUG: Contagens calculadas:', {
          quotes: quotesResponse.count,
          users: usersResponse.count
        });

        const mockUsage: ClientUsage = {
          id: 'temp',
          client_id: currentClient.id,
          quotes_this_month: quotesResponse.count || 0,
          users_count: usersResponse.count || 0,
          storage_used_gb: Math.random() * 2, // Mock
          quote_responses_this_month: 0,
          products_in_catalog: 0,
          categories_count: 0,
          last_reset_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };

        console.log('💭 DEBUG: Usage mock criado:', mockUsage);
        setClientUsage(mockUsage);
      } else {
        console.log('✅ DEBUG: Usage encontrado no banco:', usage);
        setClientUsage(usage);
      }
    } catch (error) {
      console.error('❌ DEBUG: Erro ao carregar dados de uso:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentClient?.id]); // Depende apenas do ID do cliente

  useEffect(() => {
    if (currentClient && !clientLoading) {
      fetchClientUsage();
    }
  }, [currentClient, clientLoading, fetchClientUsage]);

  // getPlanById usando useMemo para evitar recálculo
  const getPlanById = useCallback((planId: string) => {
    const plan = subscriptionPlans.find(p => p.id === planId);
    console.log('🔍 DEBUG: Buscando plano:', { planId, found: !!plan, planName: plan?.display_name });
    return plan;
  }, [subscriptionPlans]);

  const checkLimit = useCallback((action: string, additionalCount: number = 1): LimitCheckResult => {
    console.log('🔍 DEBUG: checkLimit chamado', {
      action,
      additionalCount,
      hasUser: !!user,
      hasCurrentClient: !!currentClient,
      hasClientUsage: !!clientUsage
    });

    if (!user || !currentClient) {
      console.log('❌ DEBUG: Usuário ou cliente não encontrado');
      return { allowed: false, reason: 'Usuário não autenticado', currentUsage: 0, limit: 0 };
    }

    if (!clientUsage) {
      console.log('❌ DEBUG: Dados de uso não carregados');
      return { allowed: false, reason: 'Dados de uso não carregados', currentUsage: 0, limit: 0 };
    }

    // Obter plano do cliente (fallback para basic se não especificado)
    const planId = currentClient.subscription_plan_id || 'basic';
    console.log('📋 DEBUG: Plano sendo usado:', planId);
    
    const userPlan = getPlanById(planId);
    
    console.log('📋 DEBUG: Plano encontrado:', {
      id: userPlan?.id,
      name: userPlan?.display_name,
      maxQuotesPerMonth: userPlan?.max_quotes_per_month,
      maxUsersPerClient: userPlan?.max_users_per_client
    });
    
    if (!userPlan) {
      console.log('❌ DEBUG: Plano não encontrado no sistema');
      return { allowed: false, reason: 'Plano não encontrado', currentUsage: 0, limit: 0 };
    }

    console.log('📊 DEBUG: Usage atual do cliente:', {
      quotes_this_month: clientUsage.quotes_this_month,
      users_count: clientUsage.users_count,
      storage_used_gb: clientUsage.storage_used_gb
    });

    switch (action) {
      case 'CREATE_QUOTE':
        const maxQuotes = userPlan?.max_quotes_per_month || 0;
        const currentQuotes = clientUsage.quotes_this_month;
        
        console.log('💬 DEBUG: Verificando limite de cotações:', {
          current: currentQuotes,
          max: maxQuotes,
          allowed: currentQuotes < maxQuotes
        });
        
        return {
          allowed: currentQuotes < maxQuotes,
          reason: currentQuotes >= maxQuotes ? `Limite de ${maxQuotes} cotações por mês atingido` : undefined,
          currentUsage: currentQuotes,
          limit: maxQuotes,
          upgradeRequired: currentQuotes >= maxQuotes
        };

      case 'CREATE_USER':
        const maxUsers = userPlan?.max_users_per_client || 0;
        const currentUsers = clientUsage.users_count;
        
        console.log('👥 DEBUG: Verificando limite de usuários:', {
          current: currentUsers,
          max: maxUsers,
          allowed: currentUsers < maxUsers
        });
        
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
    const plan = getPlanById(planId);
    
    console.log('🎯 DEBUG: userPlan final:', {
      planId,
      planFound: !!plan,
      planName: plan?.display_name,
      allPlansCount: subscriptionPlans.length
    });
    
    return plan;
  }, [currentClient?.subscription_plan_id, getPlanById, subscriptionPlans.length]);

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