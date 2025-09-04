-- Fix supplier visibility definitively
-- 1) Update helper to include quote_suppliers/selected_supplier_ids and accept supplier_scope 'all' as global
CREATE OR REPLACE FUNCTION public.current_user_can_see_quote(quote_id_param text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.quotes q 
    WHERE q.id = quote_id_param AND (
      -- Admin can see all
      public.get_user_role() = 'admin'::text OR
      -- Client members can see their quotes
      q.client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid()) OR
      -- Quote creator
      q.created_by = auth.uid() OR
      -- Direct supplier assignment on quotes table
      q.supplier_id = public.get_current_user_supplier_id() OR
      -- Supplier explicitly mapped via quote_suppliers
      EXISTS (
        SELECT 1 FROM public.quote_suppliers qs 
        WHERE qs.quote_id = q.id AND qs.supplier_id = public.get_current_user_supplier_id()
      ) OR
      -- Supplier that already responded
      EXISTS (
        SELECT 1 FROM public.quote_responses qr 
        WHERE qr.quote_id = q.id AND qr.supplier_id = public.get_current_user_supplier_id()
      ) OR
      -- Open quotes to all suppliers (accept both 'global' and 'all')
      (q.supplier_scope IN ('global','all') AND q.status IN ('sent','receiving') AND public.get_user_role() = 'supplier'::text) OR
      -- Local quotes open (not targeted to a specific supplier)
      (q.supplier_scope = 'local' AND q.supplier_id IS NULL AND q.status IN ('sent','receiving') AND public.get_user_role() = 'supplier'::text) OR
      -- Selected suppliers via array field
      (
        public.get_current_user_supplier_id() IS NOT NULL 
        AND q.selected_supplier_ids IS NOT NULL 
        AND public.get_current_user_supplier_id() = ANY(q.selected_supplier_ids)
      )
    )
  );
END;
$$;

-- 2) Align quotes SELECT policy to use the helper so all conditions are centralized
DROP POLICY IF EXISTS quotes_select_policy ON public.quotes;
CREATE POLICY quotes_select_policy
ON public.quotes
FOR SELECT
USING (public.current_user_can_see_quote(id));
