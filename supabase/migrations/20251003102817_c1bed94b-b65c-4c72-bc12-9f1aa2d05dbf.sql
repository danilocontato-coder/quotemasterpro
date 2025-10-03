-- =====================================================
-- FIX: Simplify and Secure Suppliers Table RLS Policies
-- =====================================================
-- This migration addresses the security finding about complex
-- RLS policies on the suppliers table that could lead to
-- unauthorized access to supplier contact information.

-- Drop all existing policies on suppliers table
DROP POLICY IF EXISTS "suppliers_admin_all" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_client_edit" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_client_insert" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_client_view" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_client_view_own" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_own_delete" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_own_select" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_own_update" ON public.suppliers;

-- =====================================================
-- SIMPLIFIED RLS POLICIES FOR SUPPLIERS TABLE
-- =====================================================

-- 1. ADMIN: Full access to everything
CREATE POLICY "suppliers_admin_full_access"
ON public.suppliers
FOR ALL
TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

-- 2. SUPPLIER: Can view and edit their own record only
CREATE POLICY "suppliers_own_view_edit"
ON public.suppliers
FOR SELECT
TO authenticated
USING (id = get_current_user_supplier_id());

CREATE POLICY "suppliers_own_update"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (id = get_current_user_supplier_id())
WITH CHECK (id = get_current_user_supplier_id());

-- 3. CLIENT: Can ONLY view suppliers they have active association with
-- This is the key security fix - must go through client_suppliers table
CREATE POLICY "suppliers_client_view_associated"
ON public.suppliers
FOR SELECT
TO authenticated
USING (
  user_has_module_access('suppliers') 
  AND get_current_user_client_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM public.client_suppliers cs
    WHERE cs.supplier_id = suppliers.id
      AND cs.client_id = get_current_user_client_id()
      AND cs.status = 'active'
  )
);

-- 4. CLIENT: Can create LOCAL suppliers (for their own use)
-- These suppliers will have client_id set and are private to that client
CREATE POLICY "suppliers_client_create_local"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (
  user_has_module_access('suppliers')
  AND auth.uid() IS NOT NULL
  AND client_id = get_current_user_client_id()
  AND type = 'local'
);

-- 5. CLIENT: Can update LOCAL suppliers they own (not certified suppliers)
CREATE POLICY "suppliers_client_update_local"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (
  user_has_module_access('suppliers')
  AND client_id = get_current_user_client_id()
  AND type = 'local'
)
WITH CHECK (
  user_has_module_access('suppliers')
  AND client_id = get_current_user_client_id()
  AND type = 'local'
);

-- 6. CLIENT: Can delete LOCAL suppliers they own
CREATE POLICY "suppliers_client_delete_local"
ON public.suppliers
FOR DELETE
TO authenticated
USING (
  user_has_module_access('suppliers')
  AND client_id = get_current_user_client_id()
  AND type = 'local'
);

-- Add helpful comment
COMMENT ON TABLE public.suppliers IS 
'Supplier data with simplified RLS policies. Access rules:
- Admins: full access
- Suppliers: can view/edit their own record
- Clients: can only view suppliers with active association in client_suppliers table
- Clients: can create/edit/delete LOCAL suppliers (client_id matches)
- No direct access to contact info without proper association';