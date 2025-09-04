-- Fix infinite recursion in RLS policies by using security definer functions

-- First, create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.current_user_can_see_quote(quote_id_param text)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user can see this specific quote
  RETURN EXISTS (
    SELECT 1 FROM public.quotes q 
    WHERE q.id = quote_id_param AND (
      -- Admin can see all
      get_user_role() = 'admin'::text OR
      -- Client can see their quotes
      q.client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()) OR
      -- Quote creator can see
      q.created_by = auth.uid() OR
      -- Supplier assigned directly
      q.supplier_id = get_current_user_supplier_id() OR
      -- Supplier assigned via quote_suppliers
      EXISTS (
        SELECT 1 FROM public.quote_suppliers qs 
        WHERE qs.quote_id = q.id AND qs.supplier_id = get_current_user_supplier_id()
      ) OR
      -- Supplier has responded to this quote
      EXISTS (
        SELECT 1 FROM public.quote_responses qr 
        WHERE qr.quote_id = q.id AND qr.supplier_id = get_current_user_supplier_id()
      ) OR
      -- Global quotes open to all suppliers
      (q.supplier_scope = 'global' AND q.status IN ('sent','receiving') AND get_user_role() = 'supplier'::text) OR
      -- Local quotes without specific assignment
      (q.supplier_scope = 'local' AND q.supplier_id IS NULL AND q.status IN ('sent','receiving') AND get_user_role() = 'supplier'::text)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Now recreate quotes policy without recursion
DROP POLICY IF EXISTS "quotes_select_policy" ON public.quotes;
CREATE POLICY "quotes_select_policy" ON public.quotes
  FOR SELECT USING (
    get_user_role() = 'admin'::text OR 
    client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()) OR 
    supplier_id = get_current_user_supplier_id() OR 
    created_by = auth.uid() OR 
    -- Use EXISTS with sub-select to avoid recursion
    id IN (
      SELECT qs.quote_id FROM public.quote_suppliers qs 
      WHERE qs.supplier_id = get_current_user_supplier_id()
    ) OR
    id IN (
      SELECT qr.quote_id FROM public.quote_responses qr 
      WHERE qr.supplier_id = get_current_user_supplier_id()
    ) OR
    (supplier_scope = 'global' AND status IN ('sent','receiving')) OR
    (supplier_scope = 'local' AND supplier_id IS NULL AND status IN ('sent','receiving'))
  );

-- Fix quote_responses policy to avoid recursion
DROP POLICY IF EXISTS "quote_responses_select" ON public.quote_responses;
CREATE POLICY "quote_responses_select" ON public.quote_responses
  FOR SELECT USING (
    get_user_role() = 'admin'::text OR 
    supplier_id = get_current_user_supplier_id() OR
    supplier_id IN (
      SELECT profiles.supplier_id FROM profiles WHERE profiles.id = auth.uid()
    )
  );

-- Fix quote_items policy to use the function
DROP POLICY IF EXISTS "quote_items_select" ON public.quote_items;
CREATE POLICY "quote_items_select" ON public.quote_items
  FOR SELECT USING (
    public.current_user_can_see_quote(quote_id)
  );

-- Test the policy by running a simple query
SELECT 'Policy test - should return quotes for supplier' as test, count(*) as quote_count
FROM public.quotes 
WHERE id IN ('RFQ02', 'RFQ03');