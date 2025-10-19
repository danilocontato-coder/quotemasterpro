-- ============================================
-- FASE 2: Solução Rápida + Validações
-- ============================================

-- 1️⃣ RESET DE SENHA: suporte@dcport.com.br
DO $$
DECLARE
  v_auth_user_id uuid;
  v_profile_exists boolean;
  v_user_exists boolean;
BEGIN
  -- Buscar auth_user_id do perfil
  SELECT id INTO v_auth_user_id
  FROM public.profiles
  WHERE LOWER(TRIM(email)) = 'suporte@dcport.com.br';
  
  IF v_auth_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Perfil não encontrado para suporte@dcport.com.br';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Perfil encontrado: %', v_auth_user_id;
  
  -- Verificar se existe na tabela users
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE auth_user_id = v_auth_user_id
  ) INTO v_user_exists;
  
  -- Forçar flag de reset de senha
  IF v_user_exists THEN
    UPDATE public.users
    SET force_password_change = true,
        updated_at = now()
    WHERE auth_user_id = v_auth_user_id;
    RAISE NOTICE '✅ Flag force_password_change ativada';
  END IF;
  
  -- Log de auditoria
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    panel_type,
    details
  ) VALUES (
    v_auth_user_id,
    'PASSWORD_RESET_PREPARED',
    'profiles',
    v_auth_user_id::text,
    'system',
    jsonb_build_object(
      'email', 'suporte@dcport.com.br',
      'method', 'migration_sql',
      'note', 'Senha deve ser resetada via Dashboard ou create-auth-user Edge Function'
    )
  );
  
  RAISE NOTICE '📝 INSTRUÇÕES PARA RESET:';
  RAISE NOTICE '1. Usar Supabase Dashboard > Auth > Users > suporte@dcport.com.br > Reset Password';
  RAISE NOTICE '2. OU chamar Edge Function create-auth-user com action=reset_password';
  RAISE NOTICE '3. Senha sugerida: SuporteDC2025!';
END $$;

-- 2️⃣ VALIDAÇÃO: CNPJ Único em Suppliers
ALTER TABLE public.suppliers 
ADD CONSTRAINT suppliers_cnpj_unique 
UNIQUE (cnpj);

-- Índice para performance em buscas por CNPJ
CREATE INDEX IF NOT EXISTS idx_suppliers_cnpj 
ON public.suppliers (cnpj) 
WHERE cnpj IS NOT NULL;

-- 3️⃣ TRIGGER: Validar formato CNPJ (14 dígitos)
CREATE OR REPLACE FUNCTION public.validate_cnpj_format()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Permitir NULL (opcional)
  IF NEW.cnpj IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Validar 14 dígitos após normalização
  IF LENGTH(REGEXP_REPLACE(NEW.cnpj, '[^0-9]', '', 'g')) != 14 THEN
    RAISE EXCEPTION 'CNPJ inválido: deve conter exatamente 14 dígitos. Recebido: %', NEW.cnpj;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ativar trigger
CREATE TRIGGER trg_suppliers_validate_cnpj
BEFORE INSERT OR UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.validate_cnpj_format();

-- ============================================
-- LOGS E CONFIRMAÇÃO
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ FASE 2 COMPLETA:';
  RAISE NOTICE '1. ✅ Reset preparado para suporte@dcport.com.br';
  RAISE NOTICE '2. ✅ CNPJ único em suppliers';
  RAISE NOTICE '3. ✅ Validação de formato CNPJ ativada';
END $$;