import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseSubscriptionPlans } from '@/hooks/useSupabaseSubscriptionPlans';
import { toast } from 'sonner';

interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  upgradeRequired?: boolean;
}

export function useSubscriptionGuard() {
  const { user } = useAuth();
  const { getPlanById } = useSupabaseSubscriptionPlans();
  const [currentUsage, setCurrentUsage] = useState({
    quotesThisMonth: 0,
    usersCount: 0,
    suppliersPerQuote: 0,
    storageUsedGB: 0,
    quoteResponsesThisMonth: 0,
    productsInCatalog: 0,
    categoriesCount: 0
  });
  
  const [currentPlan, setCurrentPlan] = useState<string>('basic');

  // Load user plan and usage data
  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      try {
        // Here we would fetch the user's current plan and usage
        // For now using mock data
        setCurrentPlan('basic');
        setCurrentUsage({
          quotesThisMonth: 15,
          usersCount: 2,
          suppliersPerQuote: 3,
          storageUsedGB: 2.5,
          quoteResponsesThisMonth: 25,
          productsInCatalog: 45,
          categoriesCount: 8
        });
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [user]);

  const checkQuotesLimit = (): LimitCheckResult => {
    const plan = getPlanById(currentPlan);
    if (!plan) {
      return { 
        allowed: false, 
        reason: 'Plano não encontrado',
        currentUsage: 0,
        limit: 0
      };
    }

    const currentUsageValue = currentUsage.quotesThisMonth;
    const limit = plan.max_quotes_per_month || plan.max_quotes;
    if (limit === -1) {
      return { allowed: true, currentUsage: currentUsageValue, limit: -1 };
    }

    const allowed = currentUsageValue < limit;
    return {
      allowed,
      reason: allowed ? undefined : `Limite de ${limit} cotações/mês atingido`,
      currentUsage: currentUsageValue,
      limit,
      upgradeRequired: !allowed
    };
  };

  const checkUsersLimit = (): LimitCheckResult => {
    const plan = getPlanById(currentPlan);
    if (!plan) {
      return { 
        allowed: false, 
        reason: 'Plano não encontrado',
        currentUsage: 0,
        limit: 0
      };
    }

    const currentUsageValue = currentUsage.usersCount;
    const limit = plan.max_users_per_client || plan.max_users;
    if (limit === -1) {
      return { allowed: true, currentUsage: currentUsageValue, limit: -1 };
    }

    const allowed = currentUsageValue < limit;
    return {
      allowed,
      reason: allowed ? undefined : `Limite de ${limit} usuários atingido`,
      currentUsage: currentUsageValue,
      limit,
      upgradeRequired: !allowed
    };
  };

  const checkSuppliersLimit = (): LimitCheckResult => {
    const plan = getPlanById(currentPlan);
    if (!plan) {
      return { 
        allowed: false, 
        reason: 'Plano não encontrado',
        currentUsage: 0,
        limit: 0
      };
    }

    const currentUsageValue = currentUsage.suppliersPerQuote;
    const limit = plan.max_suppliers_per_quote || 5;
    if (limit === -1) {
      return { allowed: true, currentUsage: currentUsageValue, limit: -1 };
    }

    const allowed = currentUsageValue < limit;
    return {
      allowed,
      reason: allowed ? undefined : `Limite de ${limit} fornecedores/cotação atingido`,
      currentUsage: currentUsageValue,
      limit,
      upgradeRequired: !allowed
    };
  };

  const checkStorageLimit = (): LimitCheckResult => {
    const plan = getPlanById(currentPlan);
    if (!plan) {
      return { 
        allowed: false, 
        reason: 'Plano não encontrado',
        currentUsage: 0,
        limit: 0
      };
    }

    const currentUsageValue = currentUsage.storageUsedGB;
    const limit = plan.max_storage_gb;
    if (limit === -1) {
      return { allowed: true, currentUsage: currentUsageValue, limit: -1 };
    }

    const allowed = currentUsageValue < limit;
    return {
      allowed,
      reason: allowed ? undefined : `Limite de ${limit}GB de armazenamento atingido`,
      currentUsage: currentUsageValue,
      limit,
      upgradeRequired: !allowed
    };
  };

  const checkQuoteResponsesLimit = (): LimitCheckResult => {
    const plan = getPlanById(currentPlan);
    if (!plan) {
      return { 
        allowed: false, 
        reason: 'Plano não encontrado',
        currentUsage: 0,
        limit: 0
      };
    }

    const currentUsageValue = currentUsage.quoteResponsesThisMonth;
    const limit = plan.max_quote_responses_per_month || 50;
    if (limit === -1) {
      return { allowed: true, currentUsage: currentUsageValue, limit: -1 };
    }

    const allowed = currentUsageValue < limit;
    return {
      allowed,
      reason: allowed ? undefined : `Limite de ${limit} respostas/mês atingido`,
      currentUsage: currentUsageValue,
      limit,
      upgradeRequired: !allowed
    };
  };

  const checkProductsLimit = (): LimitCheckResult => {
    const plan = getPlanById(currentPlan);
    if (!plan) {
      return { 
        allowed: false, 
        reason: 'Plano não encontrado',
        currentUsage: 0,
        limit: 0
      };
    }

    const currentUsageValue = currentUsage.productsInCatalog;
    const limit = plan.max_products_in_catalog || 100;
    if (limit === -1) {
      return { allowed: true, currentUsage: currentUsageValue, limit: -1 };
    }

    const allowed = currentUsageValue < limit;
    return {
      allowed,
      reason: allowed ? undefined : `Limite de ${limit} produtos no catálogo atingido`,
      currentUsage: currentUsageValue,
      limit,
      upgradeRequired: !allowed
    };
  };

  const checkCategoriesLimit = (): LimitCheckResult => {
    const plan = getPlanById(currentPlan);
    if (!plan) {
      return { 
        allowed: false, 
        reason: 'Plano não encontrado',
        currentUsage: 0,
        limit: 0
      };
    }

    const currentUsageValue = currentUsage.categoriesCount;
    const limit = plan.max_categories_per_supplier || 10;
    if (limit === -1) {
      return { allowed: true, currentUsage: currentUsageValue, limit: -1 };
    }

    const allowed = currentUsageValue < limit;
    return {
      allowed,
      reason: allowed ? undefined : `Limite de ${limit} categorias atingido`,
      currentUsage: currentUsageValue,
      limit,
      upgradeRequired: !allowed
    };
  };

  const showUpgradePrompt = (reason: string) => {
    toast.error(reason + '\n\nFaça upgrade do seu plano para continuar.', {
      duration: 5000,
      action: {
        label: "Ver Planos",
        onClick: () => {
          // Navigate to plans page using React Router
          import('react-router-dom').then(({ useNavigate }) => {
            // This is a workaround - in a real component, we'd use the hook directly
            window.dispatchEvent(new CustomEvent('navigate-to', { detail: '/plans' }));
          });
        }
      }
    });
  };

  const checkLimit = (action: string): LimitCheckResult => {
    switch (action) {
      case 'CREATE_QUOTE':
        return checkQuotesLimit();
      case 'CREATE_USER':
        return checkUsersLimit();
      case 'ADD_SUPPLIER_TO_QUOTE':
        return checkSuppliersLimit();
      case 'UPLOAD_FILE':
        return checkStorageLimit();
      case 'RECEIVE_QUOTE_RESPONSE':
        return checkQuoteResponsesLimit();
      case 'CREATE_PRODUCT':
        return checkProductsLimit();
      case 'CREATE_CATEGORY':
        return checkCategoriesLimit();
      default:
        return { allowed: true, currentUsage: 0, limit: -1 };
    }
  };

  const enforceLimit = (action: string): boolean => {
    const result = checkLimit(action);
    
    if (!result.allowed && result.reason) {
      showUpgradePrompt(result.reason);
    }

    return result.allowed;
  };

  const getUsagePercentage = (action: string): number => {
    const result = checkLimit(action);
    
    if (result.limit === -1) return 0; // Unlimited
    if (result.limit === 0) return 100;
    
    return Math.round((result.currentUsage / result.limit) * 100);
  };

  const isNearLimit = (action: string, threshold: number = 80): boolean => {
    return getUsagePercentage(action) >= threshold;
  };

  return {
    checkLimit,
    enforceLimit,
    currentUsage,
    currentPlan,
    checkQuotesLimit,
    checkUsersLimit,
    checkSuppliersLimit,
    checkStorageLimit,
    checkQuoteResponsesLimit,
    checkProductsLimit,
    checkCategoriesLimit,
    showUpgradePrompt,
    getUsagePercentage,
    isNearLimit,
    userPlan: getPlanById(currentPlan)
  };
}