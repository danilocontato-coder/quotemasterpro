-- =====================================================
-- Correção: has_role_text com fallback para profiles
-- =====================================================

-- 1. Atualizar função has_role_text para incluir fallback
CREATE OR REPLACE FUNCTION public.has_role_text(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = _role
  )
  -- Fallback para profiles durante período de migração
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = _role
  );
$$;

-- 2. Popular user_roles com super_admins existentes (mapeando admin do profiles para super_admin)
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'super_admin'::app_role
FROM public.profiles p
WHERE p.role IN ('admin', 'super_admin')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'super_admin'
  )
ON CONFLICT (user_id, role) DO NOTHING;