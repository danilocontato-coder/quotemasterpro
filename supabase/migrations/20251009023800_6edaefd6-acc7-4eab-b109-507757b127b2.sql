-- Normalize roles back to canonical value 'admin'
-- This fixes access blocks caused by using non-canonical role labels like 'super_admin'

-- 1) Update profiles using super_admin or variants to 'admin'
UPDATE public.profiles
SET role = 'admin', updated_at = now()
WHERE role IN ('super_admin', 'superadmin', 'administrator');

-- 2) Optional safety: if there is any users table copy of role, align it too (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    UPDATE public.users
    SET role = 'admin', updated_at = now()
    WHERE role IN ('super_admin', 'superadmin', 'administrator');
  END IF;
END $$;

-- Note: user_roles.role uses enum public.app_role and never had 'super_admin', so no change needed there.

-- 3) Prevent future drift: add a simple CHECK to profiles.role if column is text with known set
-- Only add if there isn't already a check or enum type. Keeps minimal impact.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    -- Try to add check only if not present
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public' AND t.relname = 'profiles' AND c.conname = 'profiles_role_allowed_values_chk'
    ) THEN
      ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_allowed_values_chk
      CHECK (role IN ('admin','manager','collaborator','client','supplier','support'));
    END IF;
  END IF;
END $$;