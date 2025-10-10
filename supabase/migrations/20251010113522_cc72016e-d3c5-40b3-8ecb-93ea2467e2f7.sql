-- ============================================
-- Correção: Remover Admin Global e Manter Admin do Cliente
-- ============================================

-- 1. Remover role 'admin' global de va@va.com.br
DELETE FROM public.user_roles
WHERE user_id = 'd9535a0a-aab8-4c53-8cef-103219db6947'
  AND role = 'admin';

-- 2. Corrigir profiles.role para 'manager'
UPDATE public.profiles
SET role = 'manager',
    updated_at = now()
WHERE id = 'd9535a0a-aab8-4c53-8cef-103219db6947';

-- 3. Registrar correção em audit_logs
INSERT INTO public.audit_logs (
  user_id,
  action,
  entity_type,
  entity_id,
  panel_type,
  details
) VALUES (
  'd9535a0a-aab8-4c53-8cef-103219db6947',
  'USER_ROLE_FIXED',
  'user_roles',
  'd9535a0a-aab8-4c53-8cef-103219db6947',
  'system',
  jsonb_build_object(
    'removed_global_admin', true,
    'kept_roles', ARRAY['admin_cliente'],
    'profile_role_fixed', 'manager',
    'reason', 'incorrect_admin_promotion_revert'
  )
);

-- 4. Melhorar get_user_role() com priorização e mapeamento
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role_val text;
BEGIN
  -- Priorizar roles na seguinte ordem:
  -- 1. admin (super admin global)
  -- 2. admin_cliente (admin de cliente específico)
  -- 3. outras roles
  SELECT role::text INTO user_role_val
  FROM user_roles
  WHERE user_id = auth.uid()
  ORDER BY 
    CASE role::text
      WHEN 'admin' THEN 1
      WHEN 'super_admin' THEN 1
      WHEN 'admin_cliente' THEN 2
      ELSE 3
    END,
    role::text
  LIMIT 1;
  
  -- Mapear super_admin para 'admin'
  IF user_role_val = 'super_admin' THEN
    RETURN 'admin';
  END IF;
  
  -- Mapear admin_cliente para 'manager' (para RLS)
  IF user_role_val = 'admin_cliente' THEN
    RETURN 'manager';
  END IF;
  
  -- Fallback para profiles
  IF user_role_val IS NULL THEN
    SELECT role::text INTO user_role_val
    FROM profiles
    WHERE id = auth.uid();
    RETURN user_role_val;
  END IF;
  
  RETURN user_role_val;
END;
$$;