-- Break circular dependency causing recursion by simplifying quote_suppliers SELECT policy
DROP POLICY IF EXISTS "quote_suppliers_select" ON public.quote_suppliers;
CREATE POLICY "quote_suppliers_select" ON public.quote_suppliers
  FOR SELECT USING (
    (get_user_role() = 'admin'::text) OR
    (supplier_id = get_current_user_supplier_id())
  );

-- Recreate quotes policy to ensure latest non-recursive version is active (idempotent)
DROP POLICY IF EXISTS "quotes_select_policy" ON public.quotes;
CREATE POLICY "quotes_select_policy" ON public.quotes
  FOR SELECT USING (
    (get_user_role() = 'admin'::text) OR
    client_id = (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()) OR
    created_by = auth.uid() OR
    supplier_id = get_current_user_supplier_id() OR
    id IN (
      SELECT qr.quote_id FROM public.quote_responses qr 
      WHERE qr.supplier_id = get_current_user_supplier_id()
    ) OR
    (supplier_scope = 'global' AND status IN ('sent','receiving')) OR
    (supplier_scope = 'local' AND supplier_id IS NULL AND status IN ('sent','receiving'))
  );

-- Ensure quote_items policy continues to use function without recursion via quote_suppliers
DROP POLICY IF EXISTS "quote_items_select" ON public.quote_items;
CREATE POLICY "quote_items_select" ON public.quote_items
  FOR SELECT USING (
    public.current_user_can_see_quote(quote_id)
  );

-- Quick smoke test queries (will be filtered by RLS)
SELECT 'quotes_accessible' as test, count(*) FROM public.quotes;
SELECT 'quote_suppliers_accessible' as test, count(*) FROM public.quote_suppliers WHERE supplier_id = get_current_user_supplier_id();