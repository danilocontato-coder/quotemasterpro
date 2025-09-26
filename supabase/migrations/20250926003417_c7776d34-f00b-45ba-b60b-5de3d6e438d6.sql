-- Remover política restritiva atual
DROP POLICY IF EXISTS "subscription_plans_view_own" ON public.subscription_plans;

-- Criar nova política que permite usuários autenticados verem todos os planos ativos
CREATE POLICY "subscription_plans_view_all" 
ON public.subscription_plans 
FOR SELECT 
USING (
  (get_user_role() = 'admin'::text) OR 
  (auth.uid() IS NOT NULL AND status = 'active'::text)
);