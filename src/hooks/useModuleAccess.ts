import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type ModuleKey = 
  | 'quotes'
  | 'suppliers'
  | 'payments'
  | 'advanced_reports'
  | 'ai_quote_analysis'
  | 'ai_negotiation'
  | 'priority_support'
  | 'custom_branding'
  | 'whatsapp_integration'
  | 'delivery_management';

interface ModuleAccessResult {
  hasAccess: boolean;
  isLoading: boolean;
  userPlanId: string | null;
  enabledModules: ModuleKey[];
}

// Cache global para evitar queries repetidas
const moduleCache = new Map<string, { data: ModuleKey[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const useModuleAccess = (requiredModule?: ModuleKey): ModuleAccessResult => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(true); // Permissivo durante carregamento
  const [isLoading, setIsLoading] = useState(true);
  const [userPlanId, setUserPlanId] = useState<string | null>(null);
  const [enabledModules, setEnabledModules] = useState<ModuleKey[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const checkModuleAccess = async () => {
      try {
        // Verificar cache primeiro
        const cacheKey = `modules_${user.id}`;
        const cached = moduleCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
          setEnabledModules(cached.data);
          setHasAccess(!requiredModule || cached.data.includes(requiredModule));
          setIsLoading(false);
          return;
        }

        // Buscar perfil e plano em uma única query otimizada
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('client_id, supplier_id')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        let planId: string | null = null;

        if (profile.client_id) {
          const { data: client } = await supabase
            .from('clients')
            .select('subscription_plan_id')
            .eq('id', profile.client_id)
            .single();
          planId = client?.subscription_plan_id || null;
        } else if (profile.supplier_id) {
          const { data: supplier } = await supabase
            .from('suppliers')
            .select('subscription_plan_id')
            .eq('id', profile.supplier_id)
            .single();
          planId = supplier?.subscription_plan_id || null;
        }

        if (!planId) {
          setIsLoading(false);
          return;
        }

        setUserPlanId(planId);

        // Buscar módulos do plano
        const { data: plan } = await supabase
          .from('subscription_plans')
          .select('enabled_modules')
          .eq('id', planId)
          .single();

        const modules = (plan?.enabled_modules as ModuleKey[]) || [];
        
        // Atualizar cache
        moduleCache.set(cacheKey, { data: modules, timestamp: Date.now() });
        
        setEnabledModules(modules);
        setHasAccess(!requiredModule || modules.includes(requiredModule));
      } catch (error) {
        console.error('Erro ao verificar acesso ao módulo:', error);
        setHasAccess(true); // Permissivo em caso de erro
      } finally {
        setIsLoading(false);
      }
    };

    checkModuleAccess();
  }, [user?.id, requiredModule]);

  return useMemo(() => ({
    hasAccess,
    isLoading,
    userPlanId,
    enabledModules
  }), [hasAccess, isLoading, userPlanId, enabledModules]);
};
