-- ============================================================================
-- HOTFIX CRÍTICO: Corrigir erro de tipo JSONB/text[] em get_user_enabled_modules
-- ============================================================================

-- 1. HOTFIX: Corrigir get_user_enabled_modules() para converter JSONB → text[] corretamente
CREATE OR REPLACE FUNCTION public.get_user_enabled_modules()
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  modules_array text[];
BEGIN
  SELECT 
    CASE 
      WHEN sp.enabled_modules IS NULL THEN '{}'::text[]
      ELSE ARRAY(SELECT jsonb_array_elements_text(sp.enabled_modules))
    END
  INTO modules_array
  FROM public.profiles p
  LEFT JOIN public.clients c ON c.id = p.client_id
  LEFT JOIN public.suppliers s ON s.id = p.supplier_id
  LEFT JOIN public.subscription_plans sp ON (
    sp.id = COALESCE(c.subscription_plan_id, s.subscription_plan_id)
  )
  WHERE p.id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(modules_array, '{}'::text[]);
END;
$$;

-- 2. Atualizar user_has_module_access() para incluir super_admin no bypass
CREATE OR REPLACE FUNCTION public.user_has_module_access(_module_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  user_modules text[];
BEGIN
  -- Bypass para admin e super_admin
  SELECT public.has_any_role(auth.uid(), ARRAY['admin','super_admin']) INTO is_admin;

  IF is_admin THEN
    RETURN true;
  END IF;

  user_modules := public.get_user_enabled_modules();
  RETURN _module_key = ANY(user_modules);
END;
$$;

-- 3. Atualizar user_has_any_module_access() para incluir super_admin no bypass
CREATE OR REPLACE FUNCTION public.user_has_any_module_access(_module_keys text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  user_modules text[];
BEGIN
  SELECT public.has_any_role(auth.uid(), ARRAY['admin','super_admin']) INTO is_admin;
  IF is_admin THEN
    RETURN true;
  END IF;

  user_modules := public.get_user_enabled_modules();
  RETURN _module_keys && user_modules; -- interseção (OR)
END;
$$;

-- 4. Atualizar user_has_all_modules_access() para incluir super_admin no bypass
CREATE OR REPLACE FUNCTION public.user_has_all_modules_access(_module_keys text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  user_modules text[];
BEGIN
  SELECT public.has_any_role(auth.uid(), ARRAY['admin','super_admin']) INTO is_admin;
  IF is_admin THEN
    RETURN true;
  END IF;

  user_modules := public.get_user_enabled_modules();
  RETURN _module_keys <@ user_modules; -- contém todos (AND)
END;
$$;

-- 5. Comentários de documentação
COMMENT ON FUNCTION public.get_user_enabled_modules() IS 'HOTFIX: Retorna array text[] de módulos habilitados, convertendo JSONB corretamente. Considera clientes e fornecedores.';
COMMENT ON FUNCTION public.user_has_module_access(text) IS 'Verifica se usuário tem acesso a módulo específico. Admin e super_admin têm bypass completo.';
COMMENT ON FUNCTION public.user_has_any_module_access(text[]) IS 'Verifica se usuário tem acesso a PELO MENOS UM dos módulos (OR logic). Admin e super_admin têm bypass completo.';
COMMENT ON FUNCTION public.user_has_all_modules_access(text[]) IS 'Verifica se usuário tem acesso a TODOS os módulos (AND logic). Admin e super_admin têm bypass completo.';