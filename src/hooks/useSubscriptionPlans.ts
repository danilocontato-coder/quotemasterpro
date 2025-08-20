import { useState, useEffect } from 'react';
import { subscriptionPlans, SubscriptionPlan, getPlanById, getPlanDisplayName } from '@/data/subscriptionPlans';
import { toast } from 'sonner';

export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAudience, setFilterAudience] = useState<'all' | 'clients' | 'suppliers' | 'both'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    // Simula carregamento dos planos
    const loadPlans = async () => {
      setIsLoading(true);
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let filteredPlans = subscriptionPlans;
      
      // Filtro por termo de busca
      if (searchTerm) {
        filteredPlans = filteredPlans.filter(plan => 
          plan.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          plan.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Filtro por público-alvo
      if (filterAudience !== 'all') {
        filteredPlans = filteredPlans.filter(plan => plan.targetAudience === filterAudience);
      }
      
      // Filtro por status
      if (filterStatus !== 'all') {
        filteredPlans = filteredPlans.filter(plan => plan.status === filterStatus);
      }
      
      setPlans(filteredPlans);
      setIsLoading(false);
    };

    loadPlans();
  }, [searchTerm, filterAudience, filterStatus]);

  const createPlan = async (planData: Omit<SubscriptionPlan, 'id'>) => {
    const newPlan = {
      ...planData,
      id: `plan-${Date.now()}`
    };
    
    // Simula criação no backend
    await new Promise(resolve => setTimeout(resolve, 500));
    
    subscriptionPlans.push(newPlan);
    setPlans([...subscriptionPlans]);
    toast.success('Plano criado com sucesso!');
    
    return newPlan;
  };

  const updatePlan = async (planId: string, planData: Partial<SubscriptionPlan>) => {
    const planIndex = subscriptionPlans.findIndex(plan => plan.id === planId);
    if (planIndex === -1) {
      throw new Error('Plano não encontrado');
    }
    
    // Simula atualização no backend
    await new Promise(resolve => setTimeout(resolve, 500));
    
    subscriptionPlans[planIndex] = { ...subscriptionPlans[planIndex], ...planData };
    setPlans([...subscriptionPlans]);
    toast.success('Plano atualizado com sucesso!');
    
    return subscriptionPlans[planIndex];
  };

  const deletePlan = async (planId: string) => {
    const planIndex = subscriptionPlans.findIndex(plan => plan.id === planId);
    if (planIndex === -1) {
      throw new Error('Plano não encontrado');
    }
    
    // Simula exclusão no backend
    await new Promise(resolve => setTimeout(resolve, 500));
    
    subscriptionPlans.splice(planIndex, 1);
    setPlans([...subscriptionPlans]);
    toast.success('Plano excluído com sucesso!');
  };

  const duplicatePlan = async (planId: string) => {
    const originalPlan = getPlanById(planId);
    if (!originalPlan) {
      throw new Error('Plano não encontrado');
    }
    
    const duplicatedPlan = {
      ...originalPlan,
      id: `plan-${Date.now()}`,
      displayName: `${originalPlan.displayName} (Cópia)`,
      status: 'inactive' as const
    };
    
    // Simula criação no backend
    await new Promise(resolve => setTimeout(resolve, 500));
    
    subscriptionPlans.push(duplicatedPlan);
    setPlans([...subscriptionPlans]);
    toast.success('Plano duplicado com sucesso!');
    
    return duplicatedPlan;
  };

  const stats = {
    totalPlans: subscriptionPlans.length,
    activePlans: subscriptionPlans.filter(plan => plan.status === 'active').length,
    clientPlans: subscriptionPlans.filter(plan => plan.targetAudience === 'clients').length,
    supplierPlans: subscriptionPlans.filter(plan => plan.targetAudience === 'suppliers').length,
    totalRevenue: subscriptionPlans.reduce((sum, plan) => sum + plan.usageStats.totalRevenue, 0),
    totalActiveUsers: subscriptionPlans.reduce((sum, plan) => sum + plan.usageStats.activeClients, 0),
    totalClients: subscriptionPlans.reduce((sum, plan) => sum + plan.usageStats.activeClients, 0),
    totalSuppliers: subscriptionPlans.reduce((sum, plan) => sum + (plan.usageStats.suppliersSubscribed || 0), 0),
    avgChurnRate: 12.5,
    revenueByAudience: {
      clients: subscriptionPlans
        .filter(plan => plan.targetAudience === 'clients')
        .reduce((sum, plan) => sum + plan.usageStats.totalRevenue, 0),
      suppliers: subscriptionPlans
        .filter(plan => plan.targetAudience === 'suppliers')
        .reduce((sum, plan) => sum + plan.usageStats.totalRevenue, 0),
      both: subscriptionPlans
        .filter(plan => plan.targetAudience === 'both')
        .reduce((sum, plan) => sum + plan.usageStats.totalRevenue, 0)
    },
    popularPlans: subscriptionPlans
      .filter(plan => plan.isPopular)
      .sort((a, b) => b.usageStats.activeClients - a.usageStats.activeClients)
      .slice(0, 3)
  };

  return {
    plans,
    isLoading,
    searchTerm,
    setSearchTerm,
    filterAudience,
    setFilterAudience,
    filterStatus,
    setFilterStatus,
    createPlan,
    updatePlan,
    deletePlan,
    duplicatePlan,
    stats,
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