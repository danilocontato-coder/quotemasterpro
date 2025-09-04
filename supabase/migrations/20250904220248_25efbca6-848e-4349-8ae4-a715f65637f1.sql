-- Fix the circular dependency in quote_responses policy
-- The issue: quote_responses policy queries quotes table, which queries quote_responses - creating infinite loop

DROP POLICY IF EXISTS "quote_responses_select" ON public.quote_responses;
CREATE POLICY "quote_responses_select" ON public.quote_responses
  FOR SELECT USING (
    -- Admin can see all
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' OR
    -- Suppliers can see their responses
    supplier_id = get_current_user_supplier_id()
    -- Removed the circular dependency to quotes table
  );

-- Also ensure quotes policy doesn't cause recursion by removing quote_responses dependency
DROP POLICY IF EXISTS "quotes_select_policy" ON public.quotes;
CREATE POLICY "quotes_select_policy" ON public.quotes
  FOR SELECT USING (
    (get_user_role() = 'admin'::text) OR
    client_id = (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()) OR
    created_by = auth.uid() OR
    supplier_id = get_current_user_supplier_id() OR
    -- Removed quote_responses dependency to break cycle
    (supplier_scope = 'global' AND status IN ('sent','receiving')) OR
    (supplier_scope = 'local' AND supplier_id IS NULL AND status IN ('sent','receiving'))
  );

-- Test queries
SELECT 'Fixed recursion test' as test, count(*) FROM public.quotes;
SELECT 'Quote responses test' as test, count(*) FROM public.quote_responses;