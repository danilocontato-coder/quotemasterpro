import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseCurrentClient } from '@/hooks/useSupabaseCurrentClient';
import { supabase } from '@/integrations/supabase/client';
import { getPlanById } from '@/data/subscriptionPlans';
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
  const { client: currentClient } = useSupabaseCurrentClient();
  const [clientUsage, setClientUsage] = useState<ClientUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados de uso atual do cliente
  useEffect(() => {
    const loadClientUsage = async () => {
      console.log('🔄 DEBUG: loadClientUsage iniciado', {
        clientId: currentClient?.id,
        clientSubscriptionPlan: currentClient?.subscription_plan_id
      });

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
    };

    loadClientUsage();
  }, [currentClient?.id]);

  const checkLimit = (action: string, additionalCount: number = 1): LimitCheckResult => {
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
      name: userPlan?.displayName,
      limitsMaxQuotes: userPlan?.limits?.maxQuotesPerMonth,
      limitsMaxUsers: userPlan?.limits?.maxUsersPerClient
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
        const quotesLimit = userPlan.limits.maxQuotesPerMonth;
        const newQuotesCount = clientUsage.quotes_this_month + additionalCount;
        
        console.log('📈 DEBUG: Verificando limite de cotações:', {
          current: clientUsage.quotes_this_month,
          additional: additionalCount,
          newTotal: newQuotesCount,
          limit: quotesLimit
        });
        
        if (quotesLimit !== -1 && newQuotesCount > quotesLimit) {
          console.log('🚫 DEBUG: Limite de cotações excedido');
          return {
            allowed: false,
            reason: `Limite de cotações mensais atingido (${quotesLimit}). Faça upgrade do seu plano para continuar.`,
            currentUsage: clientUsage.quotes_this_month,
            limit: quotesLimit,
            upgradeRequired: true
          };
        }
        
        console.log('✅ DEBUG: Limite de cotações OK');
        return {
          allowed: true,
          currentUsage: clientUsage.quotes_this_month,
          limit: quotesLimit
        };

      case 'ADD_USER':
        const usersLimit = userPlan.limits.maxUsersPerClient;
        const newUsersCount = clientUsage.users_count + additionalCount;
        
        console.log('👥 DEBUG: Verificando limite de usuários:', {
          current: clientUsage.users_count,
          additional: additionalCount,
          newTotal: newUsersCount,
          limit: usersLimit
        });
        
        if (usersLimit !== -1 && newUsersCount > usersLimit) {
          console.log('🚫 DEBUG: Limite de usuários excedido');
          return {
            allowed: false,
            reason: `Limite de usuários atingido (${usersLimit}). Faça upgrade do seu plano para adicionar mais usuários.`,
            currentUsage: clientUsage.users_count,
            limit: usersLimit,
            upgradeRequired: true
          };
        }
        
        console.log('✅ DEBUG: Limite de usuários OK');
        return {
          allowed: true,
          currentUsage: clientUsage.users_count,
          limit: usersLimit
        };

      case 'ADD_SUPPLIER_TO_QUOTE':
        const suppliersLimit = userPlan.limits.maxSuppliersPerQuote;
        
        if (suppliersLimit !== -1 && additionalCount > suppliersLimit) {
          return {
            allowed: false,
            reason: `Limite de fornecedores por cotação atingido (${suppliersLimit}). Faça upgrade do seu plano.`,
            currentUsage: additionalCount,
            limit: suppliersLimit,
            upgradeRequired: true
          };
        }
        
        return {
          allowed: true,
          currentUsage: additionalCount,
          limit: suppliersLimit
        };

      case 'UPLOAD_FILE':
        const storageLimit = userPlan.limits.maxStorageGB;
        const additionalStorageGB = additionalCount / 1024; // Convert MB to GB
        const newStorageUsage = clientUsage.storage_used_gb + additionalStorageGB;
        
        if (storageLimit !== -1 && newStorageUsage > storageLimit) {
          return {
            allowed: false,
            reason: `Limite de armazenamento atingido (${storageLimit}GB). Faça upgrade do seu plano.`,
            currentUsage: clientUsage.storage_used_gb,
            limit: storageLimit,
            upgradeRequired: true
          };
        }
        
        return {
          allowed: true,
          currentUsage: clientUsage.storage_used_gb,
          limit: storageLimit
        };

      case 'RESPOND_TO_QUOTE':
        const responsesLimit = userPlan.limits.maxQuoteResponsesPerMonth;
        const newResponsesCount = clientUsage.quote_responses_this_month + additionalCount;
        
        if (responsesLimit !== -1 && newResponsesCount > responsesLimit) {
          return {
            allowed: false,
            reason: `Limite de respostas mensais atingido (${responsesLimit}). Faça upgrade do seu plano.`,
            currentUsage: clientUsage.quote_responses_this_month,
            limit: responsesLimit,
            upgradeRequired: true
          };
        }
        
        return {
          allowed: true,
          currentUsage: clientUsage.quote_responses_this_month,
          limit: responsesLimit
        };

      case 'ADD_PRODUCT':
        const productsLimit = userPlan.limits.maxProductsInCatalog;
        const newProductsCount = clientUsage.products_in_catalog + additionalCount;
        
        if (productsLimit !== -1 && newProductsCount > productsLimit) {
          return {
            allowed: false,
            reason: `Limite de produtos no catálogo atingido (${productsLimit}). Faça upgrade do seu plano.`,
            currentUsage: clientUsage.products_in_catalog,
            limit: productsLimit,
            upgradeRequired: true
          };
        }
        
        return {
          allowed: true,
          currentUsage: clientUsage.products_in_catalog,
          limit: productsLimit
        };

      case 'ADD_CATEGORY':
        const categoriesLimit = userPlan.limits.maxCategoriesPerSupplier;
        const newCategoriesCount = clientUsage.categories_count + additionalCount;
        
        if (categoriesLimit !== -1 && newCategoriesCount > categoriesLimit) {
          return {
            allowed: false,
            reason: `Limite de categorias atingido (${categoriesLimit}). Faça upgrade do seu plano.`,
            currentUsage: clientUsage.categories_count,
            limit: categoriesLimit,
            upgradeRequired: true
          };
        }
        
        return {
          allowed: true,
          currentUsage: clientUsage.categories_count,
          limit: categoriesLimit
        };

      default:
        return {
          allowed: true,
          currentUsage: 0,
          limit: -1
        };
    }
  };

  const showUpgradeToast = (result: LimitCheckResult) => {
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
  };

  const enforceLimit = (action: string, additionalCount: number = 1): boolean => {
    const result = checkLimit(action, additionalCount);
    
    if (!result.allowed) {
      showUpgradeToast(result);
      return false;
    }
    
    return true;
  };

  const getUsagePercentage = (action: string): number => {
    const result = checkLimit(action, 0);
    
    if (result.limit === -1) return 0; // Unlimited
    if (result.limit === 0) return 100;
    
    return Math.round((result.currentUsage / result.limit) * 100);
  };

  const isNearLimit = (action: string, threshold: number = 80): boolean => {
    return getUsagePercentage(action) >= threshold;
  };

  const refreshUsage = async () => {
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
  };

  const getCurrentUsage = () => {
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
  };

  const userPlan = currentClient?.subscription_plan_id 
    ? getPlanById(currentClient.subscription_plan_id) 
    : getPlanById('basic');

  console.log('🎯 DEBUG: userPlan final:', {
    planId: currentClient?.subscription_plan_id || 'basic',
    planFound: !!userPlan,
    planName: userPlan?.displayName
  });

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