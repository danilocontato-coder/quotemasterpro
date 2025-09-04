-- Adjust quotes SELECT policy to remove cross-table reference and avoid recursion
DROP POLICY IF EXISTS "quotes_select_policy" ON public.quotes;

CREATE POLICY "quotes_select_policy" ON public.quotes
FOR SELECT
TO authenticated
USING (
  get_user_role() = 'admin'::text 
  OR client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
  OR supplier_id = get_current_user_supplier_id()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM quote_responses qr 
    WHERE qr.quote_id = quotes.id 
      AND qr.supplier_id = get_current_user_supplier_id()
  )
);
