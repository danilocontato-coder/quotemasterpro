import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type ModuleKey = 
  | 'quotes'
  | 'suppliers'
  | 'payments'
  | 'approvals'
  | 'cost_centers'
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
        // Detectar modo admin simulado
        const urlParams = new URLSearchParams(window.location.search);
        const adminToken = urlParams.get('adminToken');
        let isSimulatedAdmin = false;
        let simulatedClientId: string | null = null;

        if (adminToken && adminToken.startsWith('admin_')) {
          const adminData = localStorage.getItem(`adminAccess_${adminToken}`);
          if (adminData) {
            const parsed = JSON.parse(adminData);
            if (parsed.isAdminMode && parsed.originalRole === 'admin' && parsed.targetClientId) {
              isSimulatedAdmin = true;
              simulatedClientId = parsed.targetClientId;
            }
          }
        }

        // Verificar cache (ajustado para modo simulado)
        const cacheKey = isSimulatedAdmin ? `modules_sim_${simulatedClientId}` : `modules_${user.id}`;
        const cached = moduleCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
          setEnabledModules(cached.data);
          setHasAccess(!requiredModule || cached.data.includes(requiredModule));
          setIsLoading(false);
          return;
        }

        let planId: string | null = null;

        if (isSimulatedAdmin && simulatedClientId) {
          // Modo admin simulado: buscar plano do cliente simulado
          console.log('🎭 [MODULE-ACCESS] Modo admin simulado detectado, buscando plano do cliente:', simulatedClientId);
          const { data: client } = await supabase
            .from('clients')
            .select('subscription_plan_id')
            .eq('id', simulatedClientId)
            .single();
          planId = client?.subscription_plan_id || null;
        } else {
          // Modo normal: buscar perfil e plano do usuário
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('client_id, supplier_id')
            .eq('id', user.id)
            .single();

          if (profileError) throw profileError;

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
        
        console.log('✅ [MODULE-ACCESS] Módulos habilitados:', { planId, modules, isSimulatedAdmin });
        
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
