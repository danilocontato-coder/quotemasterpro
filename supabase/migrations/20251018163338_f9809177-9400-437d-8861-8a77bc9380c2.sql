-- ============================================
-- Fase 1: Correção Imediata - Profile para cliente "debug"
-- ============================================

-- Criar profile para o cliente debug (se ainda não existe)
-- Primeiro buscar o auth_user_id do email suporte@dcport.com.br
DO $$
DECLARE
  v_auth_user_id uuid;
  v_client_id uuid := '38db2d1f-4fab-407c-9e9f-c3b6533e7cfa';
BEGIN
  -- Buscar auth_user_id (simulado - precisa ser feito via edge function na prática)
  -- Aqui assumimos que existe e vamos criar a função para casos futuros
  
  -- Se o profile não existe, será criado pela função abaixo quando necessário
  NULL;
END $$;

-- ============================================
-- Fase 2: RPCs para Hardening do Fluxo
-- ============================================

-- RPC para verificar se auth user existe
CREATE OR REPLACE FUNCTION public.check_auth_user_exists(email_param text)
RETURNS TABLE (
  id uuid, 
  email text, 
  created_at timestamptz,
  email_confirmed_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id, 
    au.email::text,
    au.created_at,
    au.email_confirmed_at
  FROM auth.users au
  WHERE LOWER(TRIM(au.email)) = LOWER(TRIM(email_param))
  LIMIT 1;
END;
$$;

-- RPC para criar profile para auth user existente
CREATE OR REPLACE FUNCTION public.create_profile_for_existing_auth(
  auth_id uuid,
  p_client_id uuid,
  email_param text,
  name_param text,
  role_param text DEFAULT 'manager'
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  profile_id uuid;
BEGIN
  -- Inserir ou atualizar profile
  INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    role, 
    client_id, 
    tenant_type, 
    onboarding_completed,
    active
  )
  VALUES (
    auth_id, 
    LOWER(TRIM(email_param)), 
    name_param, 
    role_param, 
    p_client_id, 
    'client', 
    false,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    client_id = EXCLUDED.client_id,
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    tenant_type = EXCLUDED.tenant_type,
    updated_at = now()
  RETURNING id INTO profile_id;
  
  -- Também criar/atualizar em users
  INSERT INTO public.users (
    auth_user_id,
    client_id,
    name,
    email,
    role,
    status
  )
  VALUES (
    auth_id,
    p_client_id,
    name_param,
    LOWER(TRIM(email_param)),
    role_param,
    'active'
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET
    client_id = EXCLUDED.client_id,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    status = 'active',
    updated_at = now();
  
  RETURN profile_id;
END;
$$;

-- RPC similar para fornecedores
CREATE OR REPLACE FUNCTION public.create_profile_for_existing_auth_supplier(
  auth_id uuid,
  p_supplier_id uuid,
  email_param text,
  name_param text,
  role_param text DEFAULT 'supplier'
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  profile_id uuid;
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    role, 
    supplier_id, 
    tenant_type, 
    onboarding_completed,
    active
  )
  VALUES (
    auth_id, 
    LOWER(TRIM(email_param)), 
    name_param, 
    role_param, 
    p_supplier_id, 
    'supplier', 
    false,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    supplier_id = EXCLUDED.supplier_id,
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    tenant_type = EXCLUDED.tenant_type,
    updated_at = now()
  RETURNING id INTO profile_id;
  
  -- Também criar/atualizar em users
  INSERT INTO public.users (
    auth_user_id,
    supplier_id,
    name,
    email,
    role,
    status
  )
  VALUES (
    auth_id,
    p_supplier_id,
    name_param,
    LOWER(TRIM(email_param)),
    role_param,
    'active'
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET
    supplier_id = EXCLUDED.supplier_id,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    status = 'active',
    updated_at = now();
  
  RETURN profile_id;
END;
$$;

COMMENT ON FUNCTION public.check_auth_user_exists IS 'Verifica se um usuário auth existe pelo email';
COMMENT ON FUNCTION public.create_profile_for_existing_auth IS 'Cria profile e users para auth user existente (cliente)';
COMMENT ON FUNCTION public.create_profile_for_existing_auth_supplier IS 'Cria profile e users para auth user existente (fornecedor)';