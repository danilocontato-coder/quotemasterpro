-- Enable RLS and add policies for cost_centers so users can see their own records
-- This fixes empty results (200 []) caused by missing SELECT policy

-- Ensure RLS is enabled
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

-- SELECT policy: client users and admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'cost_centers' 
      AND policyname = 'cost_centers_select'
  ) THEN
    CREATE POLICY cost_centers_select
      ON public.cost_centers
      FOR SELECT
      USING ((get_user_role() = 'admin') OR (client_id = get_current_user_client_id()));
  END IF;
END $$;

-- INSERT policy: allow inserts for current client (and admins)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'cost_centers' 
      AND policyname = 'cost_centers_insert'
  ) THEN
    CREATE POLICY cost_centers_insert
      ON public.cost_centers
      FOR INSERT
      WITH CHECK ((get_user_role() = 'admin') OR (client_id = get_current_user_client_id()));
  END IF;
END $$;

-- UPDATE policy: allow updates within same client (and admins)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'cost_centers' 
      AND policyname = 'cost_centers_update'
  ) THEN
    CREATE POLICY cost_centers_update
      ON public.cost_centers
      FOR UPDATE
      USING ((get_user_role() = 'admin') OR (client_id = get_current_user_client_id()))
      WITH CHECK ((get_user_role() = 'admin') OR (client_id = get_current_user_client_id()));
  END IF;
END $$;

-- Optional: prevent DELETEs via policy (no policy = denied). We intentionally do not create DELETE policy since app uses soft delete via active=false.
