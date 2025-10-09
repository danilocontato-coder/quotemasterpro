
-- Corrigir role na tabela profiles para super_admin
UPDATE public.profiles
SET role = 'super_admin'
WHERE id = '337ec439-2adf-4c3c-a798-b7065ab92ce6';

-- Adicionar comentário para documentar
COMMENT ON TABLE public.profiles IS 'Perfis de usuário - role deve corresponder ao role em user_roles';
