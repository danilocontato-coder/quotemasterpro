import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
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
  const { getPlanById } = useSubscriptionPlans();
  const [currentUsage, setCurrentUsage] = useState({
    quotesThisMonth: 0,
    usersCount: 0,
    suppliersPerQuote: 0,
    storageUsedGB: 0,
    quoteResponsesThisMonth: 0,
    productsInCatalog: 0,
    categoriesCount: 0
  });

  // Simular carregamento de dados de uso atual
  useEffect(() => {
    const loadUsageData = async () => {
      // Em produção, isso viria da API
      const mockUsage = {
        quotesThisMonth: Math.floor(Math.random() * 45) + 1,
        usersCount: Math.floor(Math.random() * 8) + 1,
        suppliersPerQuote: Math.floor(Math.random() * 4) + 1,
        storageUsedGB: Math.floor(Math.random() * 4) + 1,
        quoteResponsesThisMonth: Math.floor(Math.random() * 40) + 1,
        productsInCatalog: Math.floor(Math.random() * 80) + 1,
        categoriesCount: Math.floor(Math.random() * 8) + 1
      };
      
      setCurrentUsage(mockUsage);
    };

    if (user) {
      loadUsageData();
    }
  }, [user]);

  const checkLimit = (action: string, additionalCount: number = 1): LimitCheckResult => {
    if (!user) {
      return { allowed: false, reason: 'Usuário não autenticado', currentUsage: 0, limit: 0 };
    }

    // Para demo, assumir que todos os usuários têm plano basic
    const userPlan = getPlanById('basic');
    
    if (!userPlan) {
      return { allowed: false, reason: 'Plano não encontrado', currentUsage: 0, limit: 0 };
    }

    switch (action) {
      case 'CREATE_QUOTE':
        const quotesLimit = userPlan.limits.maxQuotesPerMonth;
        const newQuotesCount = currentUsage.quotesThisMonth + additionalCount;
        
        if (quotesLimit !== -1 && newQuotesCount > quotesLimit) {
          return {
            allowed: false,
            reason: `Limite de cotações mensais atingido (${quotesLimit}). Faça upgrade do seu plano para continuar.`,
            currentUsage: currentUsage.quotesThisMonth,
            limit: quotesLimit,
            upgradeRequired: true
          };
        }
        
        return {
          allowed: true,
          currentUsage: currentUsage.quotesThisMonth,
          limit: quotesLimit
        };

      case 'ADD_USER':
        const usersLimit = userPlan.limits.maxUsersPerClient;
        const newUsersCount = currentUsage.usersCount + additionalCount;
        
        if (usersLimit !== -1 && newUsersCount > usersLimit) {
          return {
            allowed: false,
            reason: `Limite de usuários atingido (${usersLimit}). Faça upgrade do seu plano para adicionar mais usuários.`,
            currentUsage: currentUsage.usersCount,
            limit: usersLimit,
            upgradeRequired: true
          };
        }
        
        return {
          allowed: true,
          currentUsage: currentUsage.usersCount,
          limit: usersLimit
        };

      case 'ADD_SUPPLIER_TO_QUOTE':
        const suppliersLimit = userPlan.limits.maxSuppliersPerQuote;
        const newSuppliersCount = currentUsage.suppliersPerQuote + additionalCount;
        
        if (suppliersLimit !== -1 && newSuppliersCount > suppliersLimit) {
          return {
            allowed: false,
            reason: `Limite de fornecedores por cotação atingido (${suppliersLimit}). Faça upgrade do seu plano.`,
            currentUsage: currentUsage.suppliersPerQuote,
            limit: suppliersLimit,
            upgradeRequired: true
          };
        }
        
        return {
          allowed: true,
          currentUsage: currentUsage.suppliersPerQuote,
          limit: suppliersLimit
        };

      case 'UPLOAD_FILE':
        const storageLimit = userPlan.limits.maxStorageGB;
        const additionalStorageGB = additionalCount / 1024; // Convert to GB
        const newStorageUsage = currentUsage.storageUsedGB + additionalStorageGB;
        
        if (storageLimit !== -1 && newStorageUsage > storageLimit) {
          return {
            allowed: false,
            reason: `Limite de armazenamento atingido (${storageLimit}GB). Faça upgrade do seu plano.`,
            currentUsage: currentUsage.storageUsedGB,
            limit: storageLimit,
            upgradeRequired: true
          };
        }
        
        return {
          allowed: true,
          currentUsage: currentUsage.storageUsedGB,
          limit: storageLimit
        };

      // Limites específicos para fornecedores
      case 'RESPOND_TO_QUOTE':
        const responsesLimit = userPlan.limits.maxQuoteResponsesPerMonth;
        const newResponsesCount = currentUsage.quoteResponsesThisMonth + additionalCount;
        
        if (responsesLimit !== -1 && newResponsesCount > responsesLimit) {
          return {
            allowed: false,
            reason: `Limite de respostas mensais atingido (${responsesLimit}). Faça upgrade do seu plano.`,
            currentUsage: currentUsage.quoteResponsesThisMonth,
            limit: responsesLimit,
            upgradeRequired: true
          };
        }
        
        return {
          allowed: true,
          currentUsage: currentUsage.quoteResponsesThisMonth,
          limit: responsesLimit
        };

      case 'ADD_PRODUCT':
        const productsLimit = userPlan.limits.maxProductsInCatalog;
        const newProductsCount = currentUsage.productsInCatalog + additionalCount;
        
        if (productsLimit !== -1 && newProductsCount > productsLimit) {
          return {
            allowed: false,
            reason: `Limite de produtos no catálogo atingido (${productsLimit}). Faça upgrade do seu plano.`,
            currentUsage: currentUsage.productsInCatalog,
            limit: productsLimit,
            upgradeRequired: true
          };
        }
        
        return {
          allowed: true,
          currentUsage: currentUsage.productsInCatalog,
          limit: productsLimit
        };

      case 'ADD_CATEGORY':
        const categoriesLimit = userPlan.limits.maxCategoriesPerSupplier;
        const newCategoriesCount = currentUsage.categoriesCount + additionalCount;
        
        if (categoriesLimit !== -1 && newCategoriesCount > categoriesLimit) {
          return {
            allowed: false,
            reason: `Limite de categorias atingido (${categoriesLimit}). Faça upgrade do seu plano.`,
            currentUsage: currentUsage.categoriesCount,
            limit: categoriesLimit,
            upgradeRequired: true
          };
        }
        
        return {
          allowed: true,
          currentUsage: currentUsage.categoriesCount,
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
            // Em produção, redirecionar para página de planos
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

  return {
    currentUsage,
    checkLimit,
    enforceLimit,
    showUpgradeToast,
    getUsagePercentage,
    isNearLimit,
    userPlan: user ? getPlanById('basic') : null // Em produção, pegar o plano real do usuário
  };
}