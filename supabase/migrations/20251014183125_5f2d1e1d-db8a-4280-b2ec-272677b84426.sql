-- Fix: Corrigir trigger sync_client_usage_users_count para ignorar fornecedores
DROP TRIGGER IF EXISTS sync_users_count ON public.users;

CREATE OR REPLACE FUNCTION public.sync_client_usage_users_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ignorar se não for usuário de cliente (fornecedores não têm client_id)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.client_id IS NOT NULL THEN
      INSERT INTO client_usage (client_id, users_count, updated_at)
      VALUES (NEW.client_id, 1, NOW())
      ON CONFLICT (client_id)
      DO UPDATE SET
        users_count = (
          SELECT COUNT(*)
          FROM users
          WHERE client_id = NEW.client_id AND status = 'active'
        ),
        updated_at = NOW();
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.client_id IS NOT NULL THEN
      UPDATE client_usage
      SET users_count = (
        SELECT COUNT(*)
        FROM users
        WHERE client_id = OLD.client_id AND status = 'active'
      ),
      updated_at = NOW()
      WHERE client_id = OLD.client_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE TRIGGER sync_users_count
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_usage_users_count();

-- Agora inserir usuários fornecedores faltantes
INSERT INTO public.users (
  auth_user_id,
  supplier_id,
  name,
  email,
  role,
  status,
  created_at
)
SELECT 
  p.id,
  p.supplier_id,
  COALESCE(p.name, split_part(p.email, '@', 1)),
  p.email,
  p.role,
  CASE WHEN p.active THEN 'active' ELSE 'inactive' END,
  p.created_at
FROM public.profiles p
WHERE p.supplier_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.auth_user_id = p.id
  );

-- Marcar onboarding como completo para fornecedores cadastrados
UPDATE public.profiles 
SET onboarding_completed = true
WHERE supplier_id IS NOT NULL
  AND role = 'supplier'
  AND onboarding_completed = false;