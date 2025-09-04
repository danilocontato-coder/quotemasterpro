import { useState, useEffect, useCallback, startTransition, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SupabaseSubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  target_audience: 'clients' | 'suppliers' | 'both';
  status: 'active' | 'inactive';
  monthly_price: number;
  yearly_price: number;
  max_quotes: number;
  max_suppliers: number;
  max_users: number;
  max_storage_gb: number;
  is_popular: boolean;
  features: string[];
  created_at: string;
  updated_at: string;
  
  // Novos campos adicionados
  allow_branding?: boolean;
  allow_custom_domain?: boolean;
  custom_color?: string;
  active_clients?: number;
  total_revenue?: number;
  clients_subscribed?: number;
  suppliers_subscribed?: number;
  max_quotes_per_month?: number;
  max_users_per_client?: number;
  max_suppliers_per_quote?: number;
  max_quote_responses_per_month?: number;
  max_products_in_catalog?: number;
  max_categories_per_supplier?: number;
}

export interface PlanFormData {
  name: string;
  display_name: string;
  description: string;
  target_audience: 'clients' | 'suppliers' | 'both';
  status: 'active' | 'inactive';
  monthly_price: number;
  yearly_price: number;
  max_quotes: number;
  max_suppliers: number;
  max_users: number;
  max_storage_gb: number;
  is_popular: boolean;
  features: string[];
  allow_branding?: boolean;
  allow_custom_domain?: boolean;
  custom_color?: string;
  max_quotes_per_month?: number;
  max_users_per_client?: number;
  max_suppliers_per_quote?: number;
  max_quote_responses_per_month?: number;
  max_products_in_catalog?: number;
  max_categories_per_supplier?: number;
}

export function useSupabaseSubscriptionPlans() {
  const [plans, setPlans] = useState<SupabaseSubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAudience, setFilterAudience] = useState<'all' | 'clients' | 'suppliers' | 'both'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Carregar planos do Supabase - VERSÃO ESTÁVEL
  const loadPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Carregando planos do Supabase...');
      
      let query = supabase
        .from('subscription_plans')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao carregar planos:', error);
        toast.error('Erro ao carregar planos');
        return;
      }

      console.log('Planos carregados:', (data || []).length);
      setPlans((data as SupabaseSubscriptionPlan[]) || []);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependências vazias para evitar loops

  // Fetch inicial APENAS uma vez
  useEffect(() => {
    loadPlans();
  }, []); // Dependências vazias intencionalmente

  // Aplicar filtros no frontend após carregar
  const filteredPlans = useMemo(() => {
    let filtered = plans;

    // Filtro por audiência
    if (filterAudience !== 'all') {
      filtered = filtered.filter(plan => plan.target_audience === filterAudience);
    }
    
    // Filtro por status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(plan => plan.status === filterStatus);
    }

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(plan => 
        plan.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [plans, searchTerm, filterAudience, filterStatus]);

  // Criar novo plano
  const createPlan = async (planData: PlanFormData): Promise<void> => {
    try {
      console.log('Criando novo plano:', planData);
      
      const generatedId = (planData.name || 'plan')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '') + '-' + Date.now();

      const { data, error } = await supabase
        .from('subscription_plans')
        .insert({
          id: generatedId,
          ...planData,
          active_clients: 0,
          total_revenue: 0,
          clients_subscribed: 0,
          suppliers_subscribed: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar plano:', error);
        throw error;
      }

      console.log('Plano criado com sucesso:', data);
      toast.success('Plano criado com sucesso!');
      
      // Recarregar lista
      await loadPlans();
    } catch (error) {
      console.error('Erro ao criar plano:', error);
      toast.error('Erro ao criar plano');
      throw error;
    }
  };

  // Atualizar plano
  const updatePlan = async (planId: string, planData: Partial<PlanFormData>): Promise<void> => {
    try {
      console.log('Atualizando plano:', planId, planData);
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .update(planData)
        .eq('id', planId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar plano:', error);
        throw error;
      }

      console.log('Plano atualizado com sucesso:', data);
      toast.success('Plano atualizado com sucesso!');
      
      // Recarregar lista
      await loadPlans();
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      toast.error('Erro ao atualizar plano');
      throw error;
    }
  };

  // Excluir plano
  const deletePlan = async (planId: string): Promise<void> => {
    try {
      console.log('Excluindo plano:', planId);
      
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) {
        console.error('Erro ao excluir plano:', error);
        throw error;
      }

      console.log('Plano excluído com sucesso');
      toast.success('Plano excluído com sucesso!');
      
      // Recarregar lista
      await loadPlans();
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast.error('Erro ao excluir plano');
      throw error;
    }
  };

  // Duplicar plano
  const duplicatePlan = async (planId: string): Promise<void> => {
    try {
      console.log('Duplicando plano:', planId);
      
      // Buscar plano original
      const { data: originalPlan, error: fetchError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (fetchError || !originalPlan) {
        throw new Error('Plano não encontrado');
      }

      // Criar cópia
      const { id: _oldId, created_at: _ca, updated_at: _ua, ...rest } = originalPlan;
      const newId = `${originalPlan.id}-copy-${Date.now()}`;
      const duplicatedPlan = {
        ...rest,
        id: newId,
        name: `${originalPlan.name}_copy_${Date.now()}`,
        display_name: `${originalPlan.display_name} (Cópia)`,
        status: 'inactive' as const,
        is_popular: false,
        active_clients: 0,
        total_revenue: 0,
        clients_subscribed: 0,
        suppliers_subscribed: 0
      };

      const { data, error } = await supabase
        .from('subscription_plans')
        .insert([duplicatedPlan])
        .select()
        .single();

      if (error) {
        console.error('Erro ao duplicar plano:', error);
        throw error;
      }

      console.log('Plano duplicado com sucesso:', data);
      toast.success('Plano duplicado com sucesso!');
      
      // Recarregar lista
      await loadPlans();
    } catch (error) {
      console.error('Erro ao duplicar plano:', error);
      toast.error('Erro ao duplicar plano');
      throw error;
    }
  };

  // Buscar plano por ID
  const getPlanById = (planId: string): SupabaseSubscriptionPlan | undefined => {
    return plans.find(plan => plan.id === planId);
  };

  // Obter nome de exibição do plano
  const getPlanDisplayName = (planId: string): string => {
    const plan = getPlanById(planId);
    return plan ? plan.display_name : 'Plano não encontrado';
  };

  // Calcular estatísticas com planos filtrados
  const stats = useMemo(() => ({
    totalPlans: filteredPlans.length,
    activePlans: filteredPlans.filter(plan => plan.status === 'active').length,
    clientPlans: filteredPlans.filter(plan => plan.target_audience === 'clients').length,
    supplierPlans: filteredPlans.filter(plan => plan.target_audience === 'suppliers').length,
    totalRevenue: filteredPlans.reduce((sum, plan) => sum + (plan.total_revenue || 0), 0),
    totalActiveUsers: filteredPlans.reduce((sum, plan) => sum + (plan.active_clients || 0), 0),
    totalClients: filteredPlans.reduce((sum, plan) => sum + (plan.clients_subscribed || 0), 0),
    totalSuppliers: filteredPlans.reduce((sum, plan) => sum + (plan.suppliers_subscribed || 0), 0),
    avgChurnRate: 12.5, // Fixo por enquanto
    revenueByAudience: {
      clients: filteredPlans
        .filter(plan => plan.target_audience === 'clients')
        .reduce((sum, plan) => sum + (plan.total_revenue || 0), 0),
      suppliers: filteredPlans
        .filter(plan => plan.target_audience === 'suppliers')
        .reduce((sum, plan) => sum + (plan.total_revenue || 0), 0),
      both: filteredPlans
        .filter(plan => plan.target_audience === 'both')
        .reduce((sum, plan) => sum + (plan.total_revenue || 0), 0)
    },
    popularPlans: filteredPlans
      .filter(plan => plan.is_popular && plan.status === 'active')
      .sort((a, b) => (b.active_clients || 0) - (a.active_clients || 0))
      .slice(0, 3)
      .map(plan => ({
        id: plan.id,
        name: plan.display_name,
        pricing: {
          monthly: plan.monthly_price,
          yearly: plan.yearly_price
        },
        targetAudience: plan.target_audience,
        usageStats: {
          clientsSubscribed: plan.clients_subscribed || 0,
          suppliersSubscribed: plan.suppliers_subscribed || 0
        }
      }))
  }), [filteredPlans]);

  return {
    plans: filteredPlans, // Retorna planos filtrados
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
    getPlanById: (planId: string) => plans.find(plan => plan.id === planId), // Busca nos planos originais
    getPlanDisplayName: (planId: string) => {
      const plan = plans.find(plan => plan.id === planId);
      return plan ? plan.display_name : 'Plano não encontrado';
    },
    loadPlans
  };
}

// Hook para buscar detalhes de um plano específico
export function useSupabasePlanDetails(planId: string) {
  const [plan, setPlan] = useState<SupabaseSubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPlan = async () => {
      if (!planId) {
        setPlan(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('Carregando detalhes do plano:', planId);
        
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', planId)
          .single();

        if (error) {
          console.error('Erro ao carregar plano:', error);
          setPlan(null);
          return;
        }

        console.log('Plano carregado:', data);
        setPlan(data as SupabaseSubscriptionPlan);
      } catch (error) {
        console.error('Erro ao carregar plano:', error);
        setPlan(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlan();
  }, [planId]);

  return {
    plan,
    isLoading,
    displayName: plan?.display_name || 'Plano não encontrado',
    features: plan?.features || [],
    limits: plan ? {
      maxQuotes: plan.max_quotes,
      maxSuppliers: plan.max_suppliers,
      maxUsers: plan.max_users,
      storageGB: plan.max_storage_gb,
      maxQuotesPerMonth: plan.max_quotes_per_month || plan.max_quotes,
      maxUsersPerClient: plan.max_users_per_client || plan.max_users,
      maxSuppliersPerQuote: plan.max_suppliers_per_quote || 5,
      maxStorageGB: plan.max_storage_gb,
      maxQuoteResponsesPerMonth: plan.max_quote_responses_per_month || 50,
      maxProductsInCatalog: plan.max_products_in_catalog || 100,
      maxCategoriesPerSupplier: plan.max_categories_per_supplier || 10
    } : {
      maxQuotes: 0,
      maxSuppliers: 0,
      maxUsers: 0,
      storageGB: 0,
      maxQuotesPerMonth: 0,
      maxUsersPerClient: 0,
      maxSuppliersPerQuote: 0,
      maxStorageGB: 0,
      maxQuoteResponsesPerMonth: 0,
      maxProductsInCatalog: 0,
      maxCategoriesPerSupplier: 0
    },
    price: plan?.monthly_price || 0,
    pricing: plan ? {
      monthly: plan.monthly_price,
      yearly: plan.yearly_price,
      discount: Math.round(((plan.monthly_price * 12 - plan.yearly_price) / (plan.monthly_price * 12)) * 100)
    } : {
      monthly: 0,
      yearly: 0,
      discount: 0
    }
  };
}