-- 1) Remover política ampla que pode bloquear INSERT 
DROP POLICY IF EXISTS "suppliers_own_access" ON public.suppliers;

-- 2) Recriar políticas específicas de acesso do próprio fornecedor
DROP POLICY IF EXISTS "suppliers_own_select" ON public.suppliers;
CREATE POLICY "suppliers_own_select"
ON public.suppliers
FOR SELECT
TO authenticated
USING (id = get_current_user_supplier_id());

DROP POLICY IF EXISTS "suppliers_own_update" ON public.suppliers;
CREATE POLICY "suppliers_own_update"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (id = get_current_user_supplier_id())
WITH CHECK (id = get_current_user_supplier_id());

DROP POLICY IF EXISTS "suppliers_own_delete" ON public.suppliers;
CREATE POLICY "suppliers_own_delete"
ON public.suppliers
FOR DELETE
TO authenticated
USING ((id = get_current_user_supplier_id()) OR (get_user_role() = 'admin'));

-- 3) Melhorar política de SELECT para clientes
DROP POLICY IF EXISTS "suppliers_client_select_by_client_id" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_associated_clients_select" ON public.suppliers;
CREATE POLICY "suppliers_associated_clients_select"
ON public.suppliers
FOR SELECT
TO authenticated
USING (
  (get_user_role() = 'admin')
  OR (id = get_current_user_supplier_id())
  OR EXISTS (
    SELECT 1 FROM public.client_suppliers cs
    WHERE cs.supplier_id = suppliers.id
      AND cs.client_id = get_current_user_client_id()
      AND cs.status = 'active'
  )
);

-- 4) Trigger para preencher automaticamente o client_id
CREATE OR REPLACE FUNCTION public.trg_suppliers_set_client_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    NEW.client_id := get_current_user_client_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_client_id_before_insert_suppliers ON public.suppliers;
CREATE TRIGGER set_client_id_before_insert_suppliers
BEFORE INSERT ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.trg_suppliers_set_client_id();

-- 5) Recriar política de INSERT mais limpa
DROP POLICY IF EXISTS "suppliers_client_insert" ON public.suppliers;
CREATE POLICY "suppliers_client_insert"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (
  (get_user_role() = 'admin')
  OR (
    auth.uid() IS NOT NULL 
    AND get_current_user_client_id() IS NOT NULL
  )
);