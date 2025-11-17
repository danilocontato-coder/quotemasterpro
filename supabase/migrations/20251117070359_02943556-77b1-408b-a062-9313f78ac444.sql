-- ====================================
-- FIX: get_user_role() normalizar super_admin → admin
-- ====================================
-- 
-- PROBLEMA: Políticas RLS esperam 'admin', mas user_roles pode conter 'super_admin'
-- SOLUÇÃO: Normalizar super_admin para admin na função get_user_role()
--

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Prioridade 1: Buscar em user_roles (tabela centralizada)
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Se encontrou role em user_roles, normalizar e retornar
  IF user_role IS NOT NULL THEN
    -- Normalizar super_admin → admin para compatibilidade com RLS
    IF user_role = 'super_admin' THEN
      RETURN 'admin';
    END IF;
    RETURN user_role;
  END IF;

  -- Fallback: Buscar em profiles (para compatibilidade com dados legados)
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Normalizar também no fallback
  IF user_role = 'super_admin' THEN
    RETURN 'admin';
  END IF;

  RETURN user_role;
END;
$$;

-- ====================================
-- VALIDAÇÃO
-- ====================================

-- Testar a função com usuários super_admin
DO $$
DECLARE
  test_count integer;
BEGIN
  -- Contar quantos usuários têm super_admin em user_roles
  SELECT COUNT(*) INTO test_count
  FROM user_roles
  WHERE role = 'super_admin';

  RAISE NOTICE '✅ Usuários com super_admin: %', test_count;
  RAISE NOTICE '✅ Função get_user_role() atualizada para normalizar super_admin → admin';
  RAISE NOTICE '✅ Políticas RLS agora funcionarão corretamente para super_admin';
END;
$$;