-- Corrigir as 2 últimas funções com search_path inseguro e otimizar performance

-- 1. Corrigir search_path das funções restantes (identificar quais são através de linter detalhado)
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.role = _role
      AND ur.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
$function$;

CREATE OR REPLACE FUNCTION public.current_user_account_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT account_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$function$;

-- 2. Criar índices para otimização de performance em consultas críticas

-- Índices para quotes (principais consultas de cotações)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_client_status 
ON public.quotes(client_id, status) WHERE status IN ('draft', 'sent', 'receiving', 'received', 'approved');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_created_by 
ON public.quotes(created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_supplier_scope_status 
ON public.quotes(supplier_scope, status) WHERE status IN ('sent', 'receiving');

-- Índices para profiles (otimizar consultas de usuário)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_client_id 
ON public.profiles(client_id) WHERE client_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_supplier_id 
ON public.profiles(supplier_id) WHERE supplier_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role_active 
ON public.profiles(role, active) WHERE active = true;

-- Índices para suppliers (otimizar busca de fornecedores)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_status_visibility 
ON public.suppliers(status, visibility_scope) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_region_state 
ON public.suppliers(region, state) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_specialties 
ON public.suppliers USING GIN(specialties) WHERE status = 'active';

-- Índices para quote_responses (otimizar análise de propostas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quote_responses_quote_supplier 
ON public.quote_responses(quote_id, supplier_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quote_responses_supplier_status 
ON public.quote_responses(supplier_id, status);

-- Índices para notifications (otimizar consultas de notificações)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read 
ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_priority 
ON public.notifications(created_at DESC, priority);

-- Índices para audit_logs (otimizar relatórios de auditoria)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_created 
ON public.audit_logs(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity 
ON public.audit_logs(entity_type, entity_id);

-- Índices para client_usage (otimizar verificação de limites)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_usage_client_updated 
ON public.client_usage(client_id, updated_at DESC);

-- Índices para users (otimizar consultas de usuários)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_auth_user_id 
ON public.users(auth_user_id) WHERE auth_user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_client_status 
ON public.users(client_id, status) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_access 
ON public.users(last_access DESC NULLS LAST);

-- 3. Otimizar função de sugestão de fornecedores para melhor performance
CREATE OR REPLACE FUNCTION public.suggest_suppliers_for_quote(
  _client_region text, 
  _client_state text, 
  _client_city text, 
  _categories text[], 
  _max_suppliers integer DEFAULT 10
)
RETURNS TABLE(
  supplier_id uuid, 
  name text, 
  region text, 
  state text, 
  city text, 
  specialties text[], 
  is_certified boolean, 
  visibility_scope text, 
  rating numeric, 
  match_score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as supplier_id,
    s.name,
    s.region,
    s.state,
    s.city,
    s.specialties,
    s.is_certified,
    s.visibility_scope,
    s.rating,
    -- Score otimizado de compatibilidade
    (
      CASE 
        WHEN s.is_certified THEN 100
        ELSE 50
      END +
      CASE 
        WHEN s.state = _client_state THEN 30
        WHEN s.region = _client_region THEN 20
        ELSE 0
      END +
      CASE 
        WHEN s.specialties && _categories THEN 25
        ELSE 0
      END
    ) as match_score
  FROM public.suppliers s
  WHERE 
    s.status = 'active'
    AND (
      s.visibility_scope = 'global' 
      OR (s.visibility_scope = 'region' AND (s.region = _client_region OR s.state = _client_state))
    )
    AND (
      s.specialties && _categories 
      OR s.is_certified = true
    )
  ORDER BY 
    s.is_certified DESC,
    match_score DESC,
    s.rating DESC NULLS LAST
  LIMIT _max_suppliers;
END;
$function$;