-- 1) Backfill imediato: sincronizar supplier_id de profiles para users
UPDATE public.users u
SET supplier_id = p.supplier_id
FROM public.profiles p
WHERE u.auth_user_id = p.id
  AND u.supplier_id IS NULL
  AND p.supplier_id IS NOT NULL;

-- 2) Função para sincronizar supplier_id automaticamente
CREATE OR REPLACE FUNCTION public.trg_users_sync_supplier_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.supplier_id IS NULL THEN
    NEW.supplier_id := (
      SELECT supplier_id
      FROM public.profiles
      WHERE id = NEW.auth_user_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Trigger BEFORE INSERT OR UPDATE em users
DROP TRIGGER IF EXISTS users_sync_supplier_id ON public.users;
CREATE TRIGGER users_sync_supplier_id
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.trg_users_sync_supplier_id();