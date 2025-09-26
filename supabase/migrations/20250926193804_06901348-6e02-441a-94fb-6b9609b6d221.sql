-- Ensure RLS and supplier creation flow works for clients
BEGIN;

-- 0) Safety: enable RLS on suppliers (no-op if already enabled)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- 1) Drop existing supplier policies to start clean and avoid conflicts
DROP POLICY IF EXISTS "suppliers_admin_all" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_own_data" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_client_view" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_client_create" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_client_edit" ON public.suppliers;

-- 2) Recreate policies for clear, minimal access
-- Admin: full access
CREATE POLICY "suppliers_admin_all"
ON public.suppliers
FOR ALL
TO authenticated
USING (public.get_user_role() = 'admin')
WITH CHECK (public.get_user_role() = 'admin');

-- Supplier users: only their own row
CREATE POLICY "suppliers_own_data"
ON public.suppliers
FOR ALL
TO authenticated
USING (id = public.get_current_user_supplier_id())
WITH CHECK (id = public.get_current_user_supplier_id());

-- Clients: view suppliers associated to their client via client_suppliers (active)
CREATE POLICY "suppliers_client_view"
ON public.suppliers
FOR SELECT
TO authenticated
USING (
  public.get_current_user_client_id() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.client_suppliers cs
    WHERE cs.supplier_id = suppliers.id
      AND cs.client_id = public.get_current_user_client_id()
      AND cs.status = 'active'
  )
);

-- Clients: create suppliers (we allow client_id null on payload; trigger fills it)
CREATE POLICY "suppliers_client_create"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.get_current_user_client_id() IS NOT NULL
  AND (client_id IS NULL OR client_id = public.get_current_user_client_id())
);

-- Clients: update suppliers they are associated to
CREATE POLICY "suppliers_client_edit"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (
  public.get_current_user_client_id() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.client_suppliers cs
    WHERE cs.supplier_id = suppliers.id
      AND cs.client_id = public.get_current_user_client_id()
  )
)
WITH CHECK (
  public.get_current_user_client_id() IS NOT NULL
);

-- 3) Triggers to ensure consistent data
-- 3.1 Normalize CNPJ on insert/update (attach to table if not attached yet)
CREATE OR REPLACE FUNCTION public.trg_suppliers_normalize_cnpj()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.cnpj := public.normalize_cnpj(NEW.cnpj);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_suppliers_normalize_cnpj ON public.suppliers;
CREATE TRIGGER before_suppliers_normalize_cnpj
BEFORE INSERT OR UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.trg_suppliers_normalize_cnpj();

-- 3.2 Auto-set client_id to current user's client when missing
CREATE OR REPLACE FUNCTION public.trg_suppliers_set_client_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    NEW.client_id := public.get_current_user_client_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_suppliers_set_client_id ON public.suppliers;
CREATE TRIGGER before_suppliers_set_client_id
BEFORE INSERT ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.trg_suppliers_set_client_id();

-- 3.3 After inserting a supplier, create the association in client_suppliers if not existing
CREATE OR REPLACE FUNCTION public.trg_link_client_supplier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.client_suppliers cs
      WHERE cs.client_id = NEW.client_id AND cs.supplier_id = NEW.id
    ) THEN
      INSERT INTO public.client_suppliers (client_id, supplier_id, status)
      VALUES (NEW.client_id, NEW.id, 'active');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_suppliers_link_client ON public.suppliers;
CREATE TRIGGER after_suppliers_link_client
AFTER INSERT ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.trg_link_client_supplier();

COMMIT;