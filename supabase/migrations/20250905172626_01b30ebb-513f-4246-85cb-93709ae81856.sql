-- Refatoração completa da autenticação multi-tenant
-- Garantir que todo usuário tenha vinculação correta

-- 1. Primeiro, vamos corrigir a estrutura da tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tenant_type TEXT DEFAULT 'client',
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- 2. Criar função para inicializar perfil de usuário de forma consistente
CREATE OR REPLACE FUNCTION public.initialize_user_profile(
  user_id UUID,
  user_email TEXT,
  user_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_id UUID := user_id;
BEGIN
  -- Inserir ou atualizar profile
  INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    role, 
    active,
    tenant_type,
    onboarding_completed,
    created_at
  ) VALUES (
    user_id,
    user_email,
    COALESCE(user_name, split_part(user_email, '@', 1)),
    'collaborator',
    true,
    'client',
    false,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    updated_at = now();
    
  RETURN profile_id;
END;
$$;

-- 3. Criar função para vincular usuário a cliente
CREATE OR REPLACE FUNCTION public.link_user_to_client(
  user_id UUID,
  target_client_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o cliente existe
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = target_client_id) THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;
  
  -- Atualizar profile com client_id
  UPDATE public.profiles 
  SET 
    client_id = target_client_id,
    onboarding_completed = true,
    updated_at = now()
  WHERE id = user_id;
  
  -- Criar/atualizar registro na tabela users se necessário
  INSERT INTO public.users (
    auth_user_id,
    client_id,
    name,
    email,
    role,
    status
  )
  SELECT 
    user_id,
    target_client_id,
    p.name,
    p.email,
    p.role,
    'active'
  FROM public.profiles p
  WHERE p.id = user_id
  ON CONFLICT (auth_user_id) DO UPDATE SET
    client_id = target_client_id,
    updated_at = now();
    
  RETURN true;
END;
$$;

-- 4. Criar função para obter cliente do usuário atual de forma segura
CREATE OR REPLACE FUNCTION public.get_current_user_client_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 5. Atualizar trigger para inicialização automática
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Inicializar perfil automaticamente
  PERFORM public.initialize_user_profile(
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'name'
  );
  
  RETURN NEW;
END;
$$;

-- Recriar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();