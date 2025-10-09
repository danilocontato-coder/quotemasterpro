-- Adicionar role super_admin para usuários de administradoras existentes
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'super_admin'::app_role
FROM public.profiles p
INNER JOIN public.clients c ON c.id = p.client_id
WHERE c.client_type = 'administradora'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'super_admin'
  );

-- Criar função para adicionar role super_admin automaticamente
CREATE OR REPLACE FUNCTION public.trg_add_admin_role_to_administradora_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_type_val client_type;
BEGIN
  -- Verificar se o usuário foi vinculado a um cliente
  IF NEW.client_id IS NOT NULL AND (OLD.client_id IS NULL OR OLD.client_id != NEW.client_id) THEN
    -- Buscar o tipo do cliente
    SELECT c.client_type INTO client_type_val
    FROM public.clients c
    WHERE c.id = NEW.client_id;
    
    -- Se for administradora, adicionar role super_admin
    IF client_type_val = 'administradora' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'super_admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função
DROP TRIGGER IF EXISTS trg_assign_admin_role_administradora ON public.profiles;
CREATE TRIGGER trg_assign_admin_role_administradora
  AFTER INSERT OR UPDATE OF client_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_add_admin_role_to_administradora_users();

-- Atualizar função get_user_role para aceitar super_admin como admin
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val app_role;
BEGIN
  SELECT role INTO user_role_val
  FROM user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Mapear super_admin para 'admin' para compatibilidade
  IF user_role_val = 'super_admin' THEN
    RETURN 'admin';
  END IF;
  
  -- Se não encontrou em user_roles, buscar em profiles
  IF user_role_val IS NULL THEN
    SELECT role INTO user_role_val
    FROM profiles
    WHERE id = auth.uid();
    
    RETURN user_role_val::text;
  END IF;
  
  RETURN user_role_val::text;
END;
$$;