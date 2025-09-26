-- RLS: Isolamento total para products e suppliers (apenas políticas, sem alterar dados)

-- PRODUCTS SELECT
DROP POLICY IF EXISTS "products_supplier_select" ON public.products;
DROP POLICY IF EXISTS "products_select_isolated" ON public.products;

CREATE POLICY "products_select_isolated"
ON public.products
FOR SELECT
USING (
  (get_user_role() = 'admin'::text)
  OR (supplier_id IS NOT NULL AND supplier_id = get_current_user_supplier_id())
  OR (client_id IS NOT NULL AND client_id = get_current_user_client_id())
);

-- SUPPLIERS SELECT
DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;
CREATE POLICY "suppliers_select"
ON public.suppliers
FOR SELECT
USING (
  (get_user_role() = 'admin'::text)
  OR (id = get_current_user_supplier_id())
  OR (client_id = get_current_user_client_id())
);