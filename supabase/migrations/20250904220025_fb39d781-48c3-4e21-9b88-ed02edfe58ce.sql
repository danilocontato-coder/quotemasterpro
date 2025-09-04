-- Drop all existing problematic policies to start fresh
DROP POLICY IF EXISTS "quotes_select_policy" ON public.quotes;
DROP POLICY IF EXISTS "quote_items_select" ON public.quote_items;
DROP POLICY IF EXISTS "quote_suppliers_select" ON public.quote_suppliers;
DROP POLICY IF EXISTS "quote_responses_select" ON public.quote_responses;

-- Create simple, non-recursive policies for quotes
CREATE POLICY "quotes_select_policy" ON public.quotes
  FOR SELECT USING (
    -- Admin can see all
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' OR
    -- Client can see their quotes  
    client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid()) OR
    -- Quote creator can see
    created_by = auth.uid() OR
    -- Supplier assigned directly
    supplier_id = (SELECT supplier_id FROM public.profiles WHERE id = auth.uid()) OR
    -- Global quotes open to suppliers
    (supplier_scope = 'global' AND status IN ('sent','receiving') AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'supplier') OR
    -- Local quotes without assignment open to suppliers  
    (supplier_scope = 'local' AND supplier_id IS NULL AND status IN ('sent','receiving') AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'supplier')
  );

-- Simple policy for quote_items
CREATE POLICY "quote_items_select" ON public.quote_items
  FOR SELECT USING (
    -- If user can see the quote, they can see its items
    quote_id IN (
      SELECT id FROM public.quotes WHERE
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' OR
        client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid()) OR
        created_by = auth.uid() OR
        supplier_id = (SELECT supplier_id FROM public.profiles WHERE id = auth.uid()) OR
        (supplier_scope = 'global' AND status IN ('sent','receiving') AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'supplier') OR
        (supplier_scope = 'local' AND supplier_id IS NULL AND status IN ('sent','receiving') AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'supplier')
    )
  );

-- Simple policy for quote_suppliers
CREATE POLICY "quote_suppliers_select" ON public.quote_suppliers
  FOR SELECT USING (
    -- Admin can see all
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' OR
    -- Suppliers can see their assignments
    supplier_id = (SELECT supplier_id FROM public.profiles WHERE id = auth.uid())
  );

-- Simple policy for quote_responses  
CREATE POLICY "quote_responses_select" ON public.quote_responses
  FOR SELECT USING (
    -- Admin can see all
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' OR
    -- Suppliers can see their responses
    supplier_id = (SELECT supplier_id FROM public.profiles WHERE id = auth.uid()) OR
    -- Clients can see responses to their quotes
    quote_id IN (
      SELECT id FROM public.quotes WHERE client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Test query to verify policies work
SELECT 'RLS Policy Test' as test, count(*) as accessible_quotes
FROM public.quotes 
WHERE true; -- This will be filtered by RLS automatically