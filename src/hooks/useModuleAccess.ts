import { useState, useEffect } from 'react';
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

export const useModuleAccess = (requiredModule?: ModuleKey): ModuleAccessResult => {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userPlanId, setUserPlanId] = useState<string | null>(null);
  const [enabledModules, setEnabledModules] = useState<ModuleKey[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      checkModuleAccess();
    }
  }, [userId, requiredModule]);

  const checkModuleAccess = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      // Buscar perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('client_id, supplier_id')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Buscar plano baseado no tipo de usuário
      let planQuery;
      if (profile.client_id) {
        planQuery = supabase
          .from('clients')
          .select('subscription_plan_id')
          .eq('id', profile.client_id)
          .single();
      } else if (profile.supplier_id) {
        planQuery = supabase
          .from('suppliers')
          .select('subscription_plan_id')
          .eq('id', profile.supplier_id)
          .single();
      } else {
        setIsLoading(false);
        return;
      }

      const { data: entity, error: entityError } = await planQuery;
      if (entityError) throw entityError;

      if (!entity?.subscription_plan_id) {
        setIsLoading(false);
        return;
      }

      setUserPlanId(entity.subscription_plan_id);

      // Buscar módulos habilitados no plano
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('enabled_modules')
        .eq('id', entity.subscription_plan_id)
        .single();

      if (planError) throw planError;

      const modules = (plan?.enabled_modules as ModuleKey[]) || [];
      setEnabledModules(modules);

      // Verificar se tem acesso ao módulo específico
      if (requiredModule) {
        setHasAccess(modules.includes(requiredModule));
      } else {
        setHasAccess(true);
      }
    } catch (error) {
      console.error('Erro ao verificar acesso ao módulo:', error);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    hasAccess,
    isLoading,
    userPlanId,
    enabledModules
  };
};
