-- Promover usuário d9535a0a-aab8-4c53-8cef-103219db6947 a admin da plataforma
-- Sem mudanças de schema, apenas atualização de dados

-- 1. Adicionar role 'admin' em user_roles (RLS vai liberar acesso total)
INSERT INTO public.user_roles (user_id, role)
VALUES ('d9535a0a-aab8-4c53-8cef-103219db6947', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Atualizar profile.role para 'admin' (UI vai reconhecer como admin)
UPDATE public.profiles
SET role = 'admin',
    updated_at = now()
WHERE id = 'd9535a0a-aab8-4c53-8cef-103219db6947';

-- Log da operação
INSERT INTO public.audit_logs (
  user_id,
  action,
  entity_type,
  entity_id,
  panel_type,
  details
) VALUES (
  'd9535a0a-aab8-4c53-8cef-103219db6947',
  'USER_PROMOTED_TO_ADMIN',
  'user_roles',
  'd9535a0a-aab8-4c53-8cef-103219db6947',
  'system',
  jsonb_build_object(
    'previous_role', 'manager',
    'new_role', 'admin',
    'reason', 'platform_admin_promotion'
  )
);