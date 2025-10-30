-- Criar função helper para checar múltiplos roles
CREATE OR REPLACE FUNCTION public.has_any_role(
  _user_id uuid,
  _roles text[]
)
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
      AND role::text = ANY(_roles)
  )
$$;

-- Atualizar política SELECT para incluir super_admin
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT
USING (
  (id = auth.uid()) 
  OR has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
);

-- Atualizar política UPDATE para incluir super_admin
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_update" ON public.profiles
FOR UPDATE
USING (
  (id = auth.uid()) 
  OR has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
);