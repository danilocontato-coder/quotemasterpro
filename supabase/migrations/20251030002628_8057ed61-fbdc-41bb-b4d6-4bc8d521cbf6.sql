-- ============================================================================
-- CORREÇÃO: Módulo de Relatórios - Funções SQL de Segurança
-- ============================================================================

-- 1. Corrigir função get_user_role() com fallback robusto
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO public
AS $$
DECLARE
  user_role_val text;
  profile_role_val text;
BEGIN
  -- 1. Buscar em profiles primeiro (mais confiável para usuários legados)
  SELECT role::text INTO profile_role_val
  FROM profiles
  WHERE id = auth.uid();
  
  -- 2. Se não encontrou em profiles, retornar NULL
  IF profile_role_val IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- 3. Tentar buscar em user_roles (usuários mais novos)
  SELECT role::text INTO user_role_val
  FROM user_roles
  WHERE user_id = auth.uid()
  ORDER BY 
    CASE role::text
      WHEN 'admin' THEN 1
      WHEN 'super_admin' THEN 1
      WHEN 'admin_cliente' THEN 2
      ELSE 3
    END,
    role::text
  LIMIT 1;
  
  -- 4. Se user_roles existe, priorizar ele com mapeamento
  IF user_role_val IS NOT NULL THEN
    -- Mapear super_admin -> admin
    IF user_role_val = 'super_admin' THEN
      RETURN 'admin';
    END IF;
    
    -- Mapear admin_cliente -> manager
    IF user_role_val = 'admin_cliente' THEN
      RETURN 'manager';
    END IF;
    
    RETURN user_role_val;
  END IF;
  
  -- 5. Fallback: retornar role de profiles
  RETURN profile_role_val;
END;
$$;

-- 2. Corrigir get_current_user_client_id() para plpgsql
CREATE OR REPLACE FUNCTION public.get_current_user_client_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_client_id UUID;
BEGIN
  SELECT client_id INTO user_client_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN user_client_id;
END;
$$;

-- 3. Corrigir get_user_enabled_modules() para garantir retorno correto
CREATE OR REPLACE FUNCTION public.get_user_enabled_modules()
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  modules_array text[];
  user_client_id UUID;
BEGIN
  -- Obter client_id do usuário
  user_client_id := public.get_current_user_client_id();
  
  IF user_client_id IS NULL THEN
    -- Se não tem client_id, retornar array vazio
    RETURN '{}'::text[];
  END IF;
  
  -- Buscar módulos do plano do cliente
  SELECT COALESCE(
    (
      SELECT sp.enabled_modules
      FROM clients c
      INNER JOIN subscription_plans sp ON c.subscription_plan_id = sp.id
      WHERE c.id = user_client_id
      LIMIT 1
    ),
    '{}'::text[]
  ) INTO modules_array;
  
  RETURN COALESCE(modules_array, '{}'::text[]);
END;
$$;

-- 4. Popular user_roles com dados legados de profiles
INSERT INTO user_roles (user_id, role)
SELECT 
  p.id as user_id,
  p.role::text as role
FROM profiles p
WHERE p.id NOT IN (SELECT user_id FROM user_roles)
  AND p.role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_id_client_id ON profiles(id, client_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON profiles(id, role);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_clients_subscription_plan ON clients(id, subscription_plan_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON quotes(created_by);

-- 6. Comentários para documentação
COMMENT ON FUNCTION public.get_user_role() IS 'Retorna o role do usuário com fallback robusto: prioriza profiles, depois user_roles com mapeamento (super_admin->admin, admin_cliente->manager)';
COMMENT ON FUNCTION public.get_current_user_client_id() IS 'Retorna o client_id do usuário autenticado da tabela profiles';
COMMENT ON FUNCTION public.get_user_enabled_modules() IS 'Retorna array de módulos habilitados no plano de assinatura do cliente do usuário';