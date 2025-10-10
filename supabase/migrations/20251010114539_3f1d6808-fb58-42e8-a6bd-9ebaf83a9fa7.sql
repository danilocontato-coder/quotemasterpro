-- ============================================
-- Correção: Reconhecer super_admin como admin
-- ============================================

-- Atualizar has_role_text para aceitar super_admin como admin
CREATE OR REPLACE FUNCTION public.has_role_text(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (
        ur.role::text = _role
        OR (_role = 'admin' AND ur.role::text = 'super_admin')
      )
  );
$$;

-- Registrar correção em audit_logs
INSERT INTO public.audit_logs (
  user_id,
  action,
  entity_type,
  entity_id,
  panel_type,
  details
) VALUES (
  '337ec439-2adf-4c3c-a798-b7065ab92ce6',
  'FUNCTION_UPDATED',
  'database_function',
  'has_role_text',
  'system',
  jsonb_build_object(
    'change', 'super_admin now recognized as admin',
    'reason', 'fix_superadmin_access_to_all_modules',
    'affected_policies', 'all RLS policies using has_role_text(auth.uid(), admin)'
  )
);