-- Ensure RLS and policies for cost_centers so client users can see their own records
-- 1) Enable RLS
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

-- 2) Drop existing conflicting policies (if any) to avoid duplication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cost_centers' AND policyname = 'cost_centers_select'
  ) THEN
    EXECUTE 'DROP POLICY "cost_centers_select" ON public.cost_centers';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cost_centers' AND policyname = 'cost_centers_insert'
  ) THEN
    EXECUTE 'DROP POLICY "cost_centers_insert" ON public.cost_centers';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cost_centers' AND policyname = 'cost_centers_update'
  ) THEN
    EXECUTE 'DROP POLICY "cost_centers_update" ON public.cost_centers';
  END IF;
END $$;

-- 3) Create policies aligned with RBAC and module access
-- SELECT: users with module access can view rows from their client; admins see all
CREATE POLICY "cost_centers_select"
ON public.cost_centers
FOR SELECT
USING (
  (
    user_has_module_access('cost_centers')
    AND (client_id = get_current_user_client_id())
  )
  OR has_role_text(auth.uid(), 'admin')
);

-- INSERT: users with module access can insert for their own client
CREATE POLICY "cost_centers_insert"
ON public.cost_centers
FOR INSERT
WITH CHECK (
  user_has_module_access('cost_centers')
  AND auth.uid() IS NOT NULL
  AND client_id = get_current_user_client_id()
);

-- UPDATE: users with module access can update their own client rows; admins can update any
CREATE POLICY "cost_centers_update"
ON public.cost_centers
FOR UPDATE
USING (
  (
    user_has_module_access('cost_centers') AND client_id = get_current_user_client_id()
  )
  OR has_role_text(auth.uid(), 'admin')
)
WITH CHECK (
  (
    user_has_module_access('cost_centers') AND client_id = get_current_user_client_id()
  )
  OR has_role_text(auth.uid(), 'admin')
);
