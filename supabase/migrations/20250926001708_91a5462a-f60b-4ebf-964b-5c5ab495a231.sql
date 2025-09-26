-- AUDITORIA E PROTEÇÃO TOTAL DO SUPERADMIN
-- Garantir que clientes e fornecedores nunca acessem dados administrativos

-- 1. CLIENTS - Políticas RLS rigorosas para admins apenas
DROP POLICY IF EXISTS "clients_admin" ON public.clients;
DROP POLICY IF EXISTS "clients_select" ON public.clients;

-- Habilitar RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Políticas super restritivas para clients
CREATE POLICY "clients_admin_only" 
ON public.clients 
FOR ALL
USING (get_user_role() = 'admin');

CREATE POLICY "clients_own_select" 
ON public.clients 
FOR SELECT 
USING (
  id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

-- 2. CLIENT_GROUPS - Apenas admins
DROP POLICY IF EXISTS "client_groups_admin_all" ON public.client_groups;
DROP POLICY IF EXISTS "client_groups_restricted_select" ON public.client_groups;

-- Habilitar RLS
ALTER TABLE public.client_groups ENABLE ROW LEVEL SECURITY;

-- Política super restritiva
CREATE POLICY "client_groups_admin_only" 
ON public.client_groups 
FOR ALL
USING (get_user_role() = 'admin');

-- 3. SUBSCRIPTION_PLANS - Apenas admins para modificar
DROP POLICY IF EXISTS "subscription_plans_admin_all" ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_authenticated_select" ON public.subscription_plans;

-- Habilitar RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Políticas restritivas
CREATE POLICY "subscription_plans_admin_full" 
ON public.subscription_plans 
FOR ALL
USING (get_user_role() = 'admin');

CREATE POLICY "subscription_plans_view_own" 
ON public.subscription_plans 
FOR SELECT 
USING (
  get_user_role() = 'admin' OR
  (auth.uid() IS NOT NULL AND (
    id IN (
      SELECT subscription_plan_id FROM clients WHERE id = get_current_user_client_id()
    ) OR
    id IN (
      SELECT subscription_plan_id FROM suppliers WHERE id = get_current_user_supplier_id()
    )
  ))
);

-- 4. SYSTEM_SETTINGS - Apenas admins
DROP POLICY IF EXISTS "system_settings_admin_all" ON public.system_settings;

-- Habilitar RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Política super restritiva
CREATE POLICY "system_settings_admin_only" 
ON public.system_settings 
FOR ALL
USING (get_user_role() = 'admin');

-- 5. FINANCIAL_SETTINGS - Apenas admins
DROP POLICY IF EXISTS "Only admins can manage financial settings" ON public.financial_settings;

-- Habilitar RLS
ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;

-- Política super restritiva
CREATE POLICY "financial_settings_admin_only" 
ON public.financial_settings 
FOR ALL
USING (get_user_role() = 'admin');

-- 6. FINANCIAL_LOGS - Apenas admins podem ver
DROP POLICY IF EXISTS "Only admins can view financial logs" ON public.financial_logs;
DROP POLICY IF EXISTS "System can insert financial logs" ON public.financial_logs;

-- Habilitar RLS
ALTER TABLE public.financial_logs ENABLE ROW LEVEL SECURITY;

-- Políticas restritivas
CREATE POLICY "financial_logs_admin_only" 
ON public.financial_logs 
FOR SELECT
USING (get_user_role() = 'admin');

CREATE POLICY "financial_logs_system_insert" 
ON public.financial_logs 
FOR INSERT
WITH CHECK (true); -- Sistema pode inserir

-- 7. INVOICES - Restringir dados sensíveis
-- Remover políticas existentes
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'invoices' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.invoices';
    END LOOP;
END $$;

-- Habilitar RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Políticas seguras para invoices
CREATE POLICY "invoices_admin_full" 
ON public.invoices 
FOR ALL
USING (get_user_role() = 'admin');

CREATE POLICY "invoices_client_view" 
ON public.invoices 
FOR SELECT
USING (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "invoices_supplier_view" 
ON public.invoices 
FOR SELECT
USING (
  supplier_id = get_current_user_supplier_id() OR
  get_user_role() = 'admin'
);

-- 8. SUBSCRIPTIONS - Restringir dados sensíveis
-- Remover políticas existentes
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'subscriptions' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.subscriptions';
    END LOOP;
END $$;

-- Habilitar RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas seguras para subscriptions
CREATE POLICY "subscriptions_admin_full" 
ON public.subscriptions 
FOR ALL
USING (get_user_role() = 'admin');

CREATE POLICY "subscriptions_client_view" 
ON public.subscriptions 
FOR SELECT
USING (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "subscriptions_supplier_view" 
ON public.subscriptions 
FOR SELECT
USING (
  supplier_id = get_current_user_supplier_id() OR
  get_user_role() = 'admin'
);

-- 9. COUPONS - Apenas admins podem gerenciar
DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;
DROP POLICY IF EXISTS "coupons_select" ON public.coupons;

-- Habilitar RLS se não estiver
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Políticas para coupons
CREATE POLICY "coupons_admin_full" 
ON public.coupons 
FOR ALL
USING (get_user_role() = 'admin');

CREATE POLICY "coupons_client_view" 
ON public.coupons 
FOR SELECT
USING (
  get_user_role() = 'admin' OR
  (active = true AND (
    client_id IS NULL OR 
    client_id = get_current_user_client_id()
  ))
);

-- 10. COUPON_USAGES - Restringir visualização
-- Remover políticas existentes
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'coupon_usages' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.coupon_usages';
    END LOOP;
END $$;

-- Habilitar RLS
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

-- Políticas para coupon_usages
CREATE POLICY "coupon_usages_admin_full" 
ON public.coupon_usages 
FOR ALL
USING (get_user_role() = 'admin');

CREATE POLICY "coupon_usages_own_view" 
ON public.coupon_usages 
FOR SELECT
USING (
  user_id = auth.uid() OR
  get_user_role() = 'admin'
);

CREATE POLICY "coupon_usages_system_insert" 
ON public.coupon_usages 
FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR
  get_user_role() = 'admin'
);