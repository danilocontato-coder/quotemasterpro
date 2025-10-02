-- Funções de validação de módulos para RLS policies (v2 - corrigido JSONB)

-- 1) Função para obter módulos habilitados do usuário atual
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

-- 2) Função para verificar se usuário tem acesso a um módulo específico
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
  -- Verificar se é admin primeiro
  SELECT public.has_role_text(auth.uid(), 'admin') INTO is_admin;
  
  IF is_admin THEN
    RETURN true;
  END IF;
  
  -- Obter módulos do usuário
  user_modules := public.get_user_enabled_modules();
  
  -- Verificar se o módulo está na lista
  RETURN _module_key = ANY(user_modules);
END;
$$;

-- 3) Função para validar acesso a múltiplos módulos (OR - precisa de pelo menos 1)
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
  SELECT public.has_role_text(auth.uid(), 'admin') INTO is_admin;
  
  IF is_admin THEN
    RETURN true;
  END IF;
  
  user_modules := public.get_user_enabled_modules();
  
  -- Verificar se há interseção entre os arrays
  RETURN _module_keys && user_modules;
END;
$$;

-- 4) Função para validar acesso a múltiplos módulos (AND - precisa de todos)
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
  SELECT public.has_role_text(auth.uid(), 'admin') INTO is_admin;
  
  IF is_admin THEN
    RETURN true;
  END IF;
  
  user_modules := public.get_user_enabled_modules();
  
  -- Verificar se todos os módulos requeridos estão no array do usuário
  RETURN _module_keys <@ user_modules;
END;
$$;

-- Comentários explicativos
COMMENT ON FUNCTION public.get_user_enabled_modules() IS 
'Retorna array de módulos habilitados no plano do usuário atual. Extrai de JSONB.';

COMMENT ON FUNCTION public.user_has_module_access(text) IS 
'Verifica se usuário tem acesso a um módulo específico. Admins sempre retornam true.';

COMMENT ON FUNCTION public.user_has_any_module_access(text[]) IS 
'Verifica se usuário tem acesso a PELO MENOS UM dos módulos listados (OR lógico).';

COMMENT ON FUNCTION public.user_has_all_modules_access(text[]) IS 
'Verifica se usuário tem acesso a TODOS os módulos listados (AND lógico).';