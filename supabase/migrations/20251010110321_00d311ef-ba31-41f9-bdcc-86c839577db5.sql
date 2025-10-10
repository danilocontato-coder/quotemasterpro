-- ==========================================
-- IMPLEMENTAÇÃO: Admin Automático do Cliente
-- ==========================================
-- Quando o primeiro usuário de um cliente é criado,
-- ele automaticamente recebe a role 'admin_cliente'

-- 1. Adicionar 'admin_cliente' ao enum app_role se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'admin_cliente'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'admin_cliente';
  END IF;
END $$;

-- 2. Criar função helper: verifica se é o primeiro usuário do cliente
CREATE OR REPLACE FUNCTION public.is_first_user_of_client(
  _client_id UUID,
  _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Retorna true se este é o ÚNICO usuário ativo deste cliente
  SELECT (
    SELECT COUNT(*) 
    FROM public.users 
    WHERE client_id = _client_id 
    AND status = 'active'
  ) = 1
  AND EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE auth_user_id = _user_id 
    AND client_id = _client_id
    AND status = 'active'
  );
$$;

-- 3. Atualizar função link_user_to_client para promover primeiro usuário
CREATE OR REPLACE FUNCTION public.link_user_to_client(
  user_id UUID,
  target_client_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  -- Verificar se o cliente existe
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = target_client_id) THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;
  
  -- Atualizar profile com client_id
  UPDATE public.profiles 
  SET 
    client_id = target_client_id,
    onboarding_completed = true,
    updated_at = now()
  WHERE id = user_id;
  
  -- Criar/atualizar registro na tabela users
  INSERT INTO public.users (
    auth_user_id,
    client_id,
    name,
    email,
    role,
    status
  )
  SELECT 
    user_id,
    target_client_id,
    p.name,
    p.email,
    p.role,
    'active'
  FROM public.profiles p
  WHERE p.id = user_id
  ON CONFLICT (auth_user_id) DO UPDATE SET
    client_id = target_client_id,
    updated_at = now();
  
  -- Verificar se é o primeiro usuário do cliente
  is_first_user := public.is_first_user_of_client(target_client_id, user_id);
  
  -- Se for o primeiro, adicionar role admin_cliente
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_id, 'admin_cliente')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Log de auditoria
    INSERT INTO public.audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      panel_type,
      details
    ) VALUES (
      user_id,
      'USER_PROMOTED_TO_CLIENT_ADMIN',
      'user_roles',
      user_id::text,
      'system',
      jsonb_build_object(
        'client_id', target_client_id,
        'role', 'admin_cliente',
        'reason', 'first_user_of_client'
      )
    );
  END IF;
    
  RETURN true;
END;
$$;

-- 4. Criar trigger de backup para promover primeiro usuário
CREATE OR REPLACE FUNCTION public.trg_promote_first_user_to_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Contar usuários ativos deste cliente
  SELECT COUNT(*) INTO user_count
  FROM public.users
  WHERE client_id = NEW.client_id
  AND status = 'active';
  
  -- Se for o primeiro usuário ativo, adicionar role admin_cliente
  IF user_count = 1 AND NEW.auth_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.auth_user_id, 'admin_cliente')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_promote_first_admin ON public.users;
CREATE TRIGGER trg_users_promote_first_admin
  AFTER INSERT ON public.users
  FOR EACH ROW
  WHEN (NEW.client_id IS NOT NULL AND NEW.status = 'active')
  EXECUTE FUNCTION public.trg_promote_first_user_to_admin();

-- 5. Adicionar políticas RLS para admin_cliente nas tabelas críticas

-- Suppliers: admin_cliente tem acesso total dentro do seu cliente
DROP POLICY IF EXISTS suppliers_client_admin_full ON public.suppliers;
CREATE POLICY suppliers_client_admin_full ON public.suppliers
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  client_id = get_current_user_client_id() 
  AND has_role_text(auth.uid(), 'admin_cliente')
)
WITH CHECK (
  client_id = get_current_user_client_id() 
  AND has_role_text(auth.uid(), 'admin_cliente')
);

-- Users: admin_cliente pode gerenciar usuários do seu cliente
DROP POLICY IF EXISTS users_client_admin_manage ON public.users;
CREATE POLICY users_client_admin_manage ON public.users
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  client_id = get_current_user_client_id()
  AND has_role_text(auth.uid(), 'admin_cliente')
)
WITH CHECK (
  client_id = get_current_user_client_id()
  AND has_role_text(auth.uid(), 'admin_cliente')
);

-- Quotes: admin_cliente tem acesso total às cotações do cliente
DROP POLICY IF EXISTS quotes_client_admin_all ON public.quotes;
CREATE POLICY quotes_client_admin_all ON public.quotes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  user_has_module_access('quotes')
  AND client_id = get_current_user_client_id()
  AND has_role_text(auth.uid(), 'admin_cliente')
)
WITH CHECK (
  user_has_module_access('quotes')
  AND client_id = get_current_user_client_id()
  AND has_role_text(auth.uid(), 'admin_cliente')
);

-- 6. Remover admin global do usuário específico (torná-lo apenas admin_cliente)
DELETE FROM public.user_roles 
WHERE user_id = 'd9535a0a-aab8-4c53-8cef-103219db6947' 
AND role = 'admin';

-- 7. Adicionar admin_cliente ao usuário atual (se ele for o primeiro do seu cliente)
DO $$
DECLARE
  current_client_id UUID;
  is_first BOOLEAN;
BEGIN
  -- Obter client_id do usuário
  SELECT client_id INTO current_client_id
  FROM public.profiles
  WHERE id = 'd9535a0a-aab8-4c53-8cef-103219db6947';
  
  -- Verificar se é o primeiro usuário
  IF current_client_id IS NOT NULL THEN
    is_first := public.is_first_user_of_client(
      current_client_id, 
      'd9535a0a-aab8-4c53-8cef-103219db6947'::UUID
    );
    
    IF is_first THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES ('d9535a0a-aab8-4c53-8cef-103219db6947', 'admin_cliente')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
END $$;