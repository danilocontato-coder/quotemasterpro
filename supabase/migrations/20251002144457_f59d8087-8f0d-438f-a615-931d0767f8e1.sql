-- Hotfix de autenticação: remover recursão RLS em profiles e padronizar checagem de roles

-- 0) Garantir tabela user_roles (idempotente, segura)
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
  );
EXCEPTION WHEN others THEN NULL; END $$;

-- 0.1) Habilitar RLS (não falha se já estiver habilitado)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 1) Função segura para checar roles via texto (evita enum e recursão)
CREATE OR REPLACE FUNCTION public.has_role_text(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role::text = _role
  );
$$;

-- 2) Recriar políticas de profiles SEM subselect recursivo
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_select"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid() OR public.has_role_text(auth.uid(), 'admin')
);

CREATE POLICY "profiles_insert"
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update"
ON public.profiles
FOR UPDATE
USING (
  id = auth.uid() OR public.has_role_text(auth.uid(), 'admin')
);

-- 3) Políticas de user_roles
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;

CREATE POLICY "user_roles_select"
ON public.user_roles
FOR SELECT
USING (
  user_id = auth.uid() OR public.has_role_text(auth.uid(), 'admin')
);

CREATE POLICY "user_roles_insert"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role_text(auth.uid(), 'admin'));

CREATE POLICY "user_roles_update"
ON public.user_roles
FOR UPDATE
USING (public.has_role_text(auth.uid(), 'admin'));

CREATE POLICY "user_roles_delete"
ON public.user_roles
FOR DELETE
USING (public.has_role_text(auth.uid(), 'admin'));
