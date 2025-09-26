BEGIN;
-- 1) Remove the FOR ALL policy that can interfere with INSERT
DROP POLICY IF EXISTS "suppliers_own_data" ON public.suppliers;

-- 2) Recreate granular policies for supplier-own access (no INSERT here)
CREATE POLICY "suppliers_own_select"
ON public.suppliers
FOR SELECT
TO authenticated
USING (id = public.get_current_user_supplier_id());

CREATE POLICY "suppliers_own_update"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (id = public.get_current_user_supplier_id())
WITH CHECK (id = public.get_current_user_supplier_id());

CREATE POLICY "suppliers_own_delete"
ON public.suppliers
FOR DELETE
TO authenticated
USING (id = public.get_current_user_supplier_id());

-- 3) Ensure client INSERT policy exists and is permissive
DROP POLICY IF EXISTS "suppliers_client_create_fixed" ON public.suppliers;
CREATE POLICY "suppliers_client_insert"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.get_current_user_client_id() IS NOT NULL
);

COMMIT;