-- Normalizar entrada do admin na tabela users
-- Garante que admin@quotemaster.com tenha entrada na tabela users para tracking de last_access

INSERT INTO public.users (auth_user_id, name, email, role, force_password_change, last_access)
SELECT 
  p.id,
  'Administrador do Sistema',
  p.email,
  p.role,
  false,
  now()
FROM public.profiles p
WHERE p.email = 'admin@quotemaster.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.auth_user_id = p.id
  );

-- Comentário: Esta migração insere o admin na tabela users caso não exista
-- Isso normaliza a estrutura e permite tracking consistente de last_access