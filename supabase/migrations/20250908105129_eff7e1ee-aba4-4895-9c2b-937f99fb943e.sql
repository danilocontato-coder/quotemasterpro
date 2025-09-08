-- Atualizar last_access automaticamente quando usuário faz login
-- Trigger para atualizar last_access na tabela users

CREATE OR REPLACE FUNCTION public.update_user_last_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Atualizar last_access apenas se o valor anterior era null ou muito antigo (mais de 1 minuto)
  IF OLD.last_access IS NULL OR (now() - OLD.last_access) > interval '1 minute' THEN
    NEW.last_access = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger para atualizar last_access quando users table é atualizada
DROP TRIGGER IF EXISTS trigger_update_user_last_access ON public.users;
CREATE TRIGGER trigger_update_user_last_access
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_last_access();