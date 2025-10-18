-- Correção: Separar nome do usuário e nome da empresa
-- Parte 1: Corrigir dados existentes em users.name

-- Atualizar users.name para refletir o nome da pessoa (profiles.name)
-- ao invés do nome da empresa (clients.name)
UPDATE public.users u
SET 
  name = p.name,
  updated_at = now()
FROM public.profiles p
WHERE u.auth_user_id = p.id
  AND u.name != p.name
  AND p.name IS NOT NULL;

-- Parte 2: Atualizar função link_user_to_client
CREATE OR REPLACE FUNCTION public.link_user_to_client(user_id uuid, target_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user BOOLEAN;
  user_name TEXT;
BEGIN
  -- Buscar nome do usuário do profile (não do cliente!)
  SELECT p.name INTO user_name
  FROM public.profiles p
  WHERE p.id = user_id;

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
  
  -- Criar/atualizar registro na tabela users usando nome da PESSOA
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
    user_name,  -- Nome do usuário, não da empresa
    p.email,
    p.role,
    'active'
  FROM public.profiles p
  WHERE p.id = user_id
  ON CONFLICT (auth_user_id) DO UPDATE SET
    client_id = target_client_id,
    name = EXCLUDED.name,  -- Atualizar com nome do usuário
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