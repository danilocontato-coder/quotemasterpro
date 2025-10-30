-- ============================================================================
-- HOTFIX: Adicionar bypass de admin em get_user_enabled_modules()
-- ============================================================================

-- Corrigir get_user_enabled_modules() com bypass explícito para admin/super_admin
CREATE OR REPLACE FUNCTION public.get_user_enabled_modules()
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  modules_array text[];
  user_role_val text;
BEGIN
  -- 1. Obter role do usuário
  user_role_val := public.get_user_role();
  
  -- 2. BYPASS: Admin e super_admin têm acesso a TODOS os módulos
  IF user_role_val IN ('admin', 'super_admin') THEN
    RETURN ARRAY[
      'dashboard',
      'quotes',
      'suppliers',
      'products',
      'approvals',
      'payments',
      'delivery_management',
      'cost_centers',
      'advanced_reports',
      'user_management',
      'ai_negotiation',
      'ai_quote_analysis',
      'custom_branding',
      'whatsapp_integration',
      'priority_support',
      'subscription_management',
      'communication',
      'help',
      'settings',
      'accountability',
      'contracts'
    ]::text[];
  END IF;
  
  -- 3. Para usuários normais: buscar do plano
  SELECT 
    CASE 
      WHEN sp.enabled_modules IS NULL THEN '{}'::text[]
      WHEN jsonb_typeof(sp.enabled_modules) = 'array' THEN 
        ARRAY(SELECT jsonb_array_elements_text(sp.enabled_modules))
      ELSE '{}'::text[]
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

-- Adicionar comentário
COMMENT ON FUNCTION public.get_user_enabled_modules() IS 
'Retorna módulos habilitados para o usuário. Admin/super_admin retornam TODOS os módulos. Usuários normais retornam baseado no plano.';