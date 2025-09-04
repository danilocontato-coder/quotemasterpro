-- Improve RLS to ensure suppliers can see assigned and public quotes and their items

-- Replace quotes policy with EXISTS for clarity
DROP POLICY IF EXISTS "quotes_select_policy" ON public.quotes;
CREATE POLICY "quotes_select_policy" ON public.quotes
  FOR SELECT USING (
    get_user_role() = 'admin'::text OR 
    client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()) OR 
    supplier_id = get_current_user_supplier_id() OR 
    created_by = auth.uid() OR 
    -- Assigned to this supplier
    EXISTS (
      SELECT 1 FROM public.quote_suppliers qs 
      WHERE qs.quote_id = quotes.id 
        AND qs.supplier_id = get_current_user_supplier_id()
    ) OR
    -- Supplier responded to this quote
    EXISTS (
      SELECT 1 FROM public.quote_responses qr 
      WHERE qr.quote_id = quotes.id 
        AND qr.supplier_id = get_current_user_supplier_id()
    ) OR
    -- Public/global quotes open to all suppliers
    (supplier_scope = 'global' AND status IN ('sent','receiving')) OR
    -- Local quotes without specific assignment
    (supplier_scope = 'local' AND supplier_id IS NULL AND status IN ('sent','receiving'))
  );

-- Allow suppliers to view quote_items for quotes they can access
DROP POLICY IF EXISTS "quote_items_select" ON public.quote_items;
CREATE POLICY "quote_items_select" ON public.quote_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quotes q 
      WHERE q.id = quote_items.quote_id AND (
        get_user_role() = 'admin'::text OR 
        q.client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()) OR 
        q.supplier_id = get_current_user_supplier_id() OR 
        q.created_by = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.quote_suppliers qs 
          WHERE qs.quote_id = q.id AND qs.supplier_id = get_current_user_supplier_id()
        ) OR
        EXISTS (
          SELECT 1 FROM public.quote_responses qr 
          WHERE qr.quote_id = q.id AND qr.supplier_id = get_current_user_supplier_id()
        ) OR
        (q.supplier_scope = 'global' AND q.status IN ('sent','receiving')) OR
        (q.supplier_scope = 'local' AND q.supplier_id IS NULL AND q.status IN ('sent','receiving'))
      )
    )
  );

-- Ensure suppliers can select from quote_suppliers by supplier_id
DROP POLICY IF EXISTS "quote_suppliers_select" ON public.quote_suppliers;
CREATE POLICY "quote_suppliers_select" ON public.quote_suppliers
  FOR SELECT USING (
    get_user_role() = 'admin'::text OR 
    supplier_id = get_current_user_supplier_id() OR 
    EXISTS (
      SELECT 1 FROM public.quotes q 
      WHERE q.id = quote_suppliers.quote_id AND q.client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid())
    )
  );

-- Quick sanity check: list assigned quotes for supplier to validate policy logic
SELECT q.id, q.title, q.status, q.supplier_scope
FROM public.quotes q
WHERE EXISTS (
  SELECT 1 FROM public.quote_suppliers qs 
  WHERE qs.quote_id = q.id AND qs.supplier_id = get_current_user_supplier_id()
);
