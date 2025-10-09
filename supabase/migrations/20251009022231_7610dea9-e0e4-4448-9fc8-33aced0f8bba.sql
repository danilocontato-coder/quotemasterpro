-- Corrigir role do usuário admin para super_admin
-- Primeiro, verificar e deletar qualquer role incorreto
DELETE FROM public.user_roles 
WHERE user_id = '337ec439-2adf-4c3c-a798-b7065ab92ce6';

-- Inserir o role correto (super_admin)
INSERT INTO public.user_roles (user_id, role)
VALUES ('337ec439-2adf-4c3c-a798-b7065ab92ce6', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Fazer o mesmo para o usuário danilo@incond.com se existir
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users 
WHERE email = 'danilo@incond.com'
ON CONFLICT (user_id, role) DO NOTHING;