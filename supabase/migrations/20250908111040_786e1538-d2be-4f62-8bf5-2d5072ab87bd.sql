-- Correção final de segurança - remover funções com referências inexistentes e otimizar

-- 1. Remover função que faz referência a tabela inexistente
DROP FUNCTION IF EXISTS public.has_role(app_role);
DROP FUNCTION IF EXISTS public.current_user_account_id();

-- 2. Criar índices críticos para performance das consultas existentes

-- Índices para quotes (principais consultas de cotações)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_client_status 
ON public.quotes(client_id, status) WHERE status IN ('draft', 'sent', 'receiving', 'received', 'approved');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_created_by 
ON public.quotes(created_by) WHERE created_by IS NOT NULL;

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

-- Índices para notifications (otimizar consultas de notificações)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read 
ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

-- Índices para audit_logs (otimizar relatórios de auditoria)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_created 
ON public.audit_logs(user_id, created_at DESC);

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

-- 3. Criar função otimizada para verificação de permissões de usuário baseada na estrutura real
CREATE OR REPLACE FUNCTION public.user_has_permission(permission_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_role text;
  user_client_id uuid;
BEGIN
  -- Buscar role e client_id do usuário
  SELECT role, client_id INTO user_role, user_client_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- Admin tem todas as permissões
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Manager tem permissões de gerenciamento
  IF user_role = 'manager' AND permission_name IN ('quotes_manage', 'suppliers_manage', 'users_manage') THEN
    RETURN true;
  END IF;
  
  -- Collaborator tem permissões básicas
  IF user_role = 'collaborator' AND permission_name IN ('quotes_create', 'quotes_view') THEN
    RETURN true;
  END IF;
  
  -- Supplier tem permissões de fornecedor
  IF user_role = 'supplier' AND permission_name IN ('quotes_respond', 'products_manage') THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;