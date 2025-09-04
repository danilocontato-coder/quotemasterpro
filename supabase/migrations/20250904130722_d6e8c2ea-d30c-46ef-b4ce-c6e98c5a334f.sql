-- Remover a função de validação que está causando problemas e criar uma nova abordagem
DROP FUNCTION IF EXISTS public.validate_user_creation(text, text);

-- Criar uma nova função mais simples que apenas verifica duplicatas
CREATE OR REPLACE FUNCTION public.check_user_email_exists(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se existe na tabela users
  IF EXISTS (SELECT 1 FROM public.users WHERE LOWER(email) = LOWER(user_email)) THEN
    RETURN true;
  END IF;
  
  -- Verificar se existe na tabela profiles
  IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(email) = LOWER(user_email)) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;