import { useState, useEffect } from 'react';
import { subscriptionPlans, SubscriptionPlan, getPlanById, getPlanDisplayName } from '@/data/subscriptionPlans';

export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simula carregamento dos planos
    const loadPlans = async () => {
      setIsLoading(true);
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 100));
      setPlans(subscriptionPlans.filter(plan => plan.status === 'active'));
      setIsLoading(false);
    };

    loadPlans();
  }, []);

  return {
    plans,
    isLoading,
    getPlanById,
    getPlanDisplayName,
  };
}

export function usePlanDetails(planId: string) {
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPlan = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      const foundPlan = getPlanById(planId);
      setPlan(foundPlan || null);
      setIsLoading(false);
    };

    if (planId) {
      loadPlan();
    } else {
      setPlan(null);
      setIsLoading(false);
    }
  }, [planId]);

  return {
    plan,
    isLoading,
    displayName: plan?.displayName || 'Plano não encontrado',
    features: plan?.features || [],
    limits: plan?.limits || { maxQuotes: 0, maxSuppliers: 0, maxUsers: 0, storageGB: 0 },
    price: plan?.price || 0,
  };
}