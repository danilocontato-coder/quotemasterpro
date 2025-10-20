-- Garantir sincronização automática Auth → Profiles
-- Substitui/atualiza o trigger existente para cobrir todos os casos

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir profile automaticamente quando usuário é criado no Auth
  INSERT INTO public.profiles (
    id, 
    email, 
    name,
    role,
    tenant_type,
    active,
    onboarding_completed,
    created_at
  ) VALUES (
    NEW.id,
    LOWER(TRIM(NEW.email)),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'collaborator'),
    COALESCE(NEW.raw_user_meta_data->>'tenant_type', 'client'),
    true,
    false,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Recriar trigger (DROP se existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Criar profiles para usuários Auth órfãos (que existem no Auth mas não no profiles)
INSERT INTO public.profiles (id, email, name, role, tenant_type, active, onboarding_completed, created_at)
SELECT 
  au.id,
  LOWER(TRIM(au.email)),
  COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    split_part(au.email, '@', 1)
  ),
  COALESCE(au.raw_user_meta_data->>'role', 'collaborator'),
  'client',
  true,
  false,
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;