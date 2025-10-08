-- Criar usuário superadmin diretamente
-- Email: superadmin@quotemaster.com
-- Senha: SuperAdmin2025!

DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Deletar usuário existente se houver
  DELETE FROM auth.users WHERE email = 'superadmin@quotemaster.com';
  
  -- Criar novo usuário com senha
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud,
    confirmation_token,
    email_change_token_current,
    email_change_token_new
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'superadmin@quotemaster.com',
    crypt('SuperAdmin2025!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Super Admin"}',
    false,
    'authenticated',
    'authenticated',
    '',
    '',
    ''
  ) RETURNING id INTO new_user_id;

  -- Criar profile
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    active,
    tenant_type,
    onboarding_completed
  ) VALUES (
    new_user_id,
    'superadmin@quotemaster.com',
    'Super Admin',
    'admin',
    true,
    'admin',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    active = EXCLUDED.active,
    tenant_type = EXCLUDED.tenant_type,
    onboarding_completed = EXCLUDED.onboarding_completed;

  -- Criar entrada na user_roles
  INSERT INTO public.user_roles (
    user_id,
    role
  ) VALUES (
    new_user_id,
    'admin'
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Usuário superadmin criado com sucesso! ID: %', new_user_id;
END $$;
