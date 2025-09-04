-- Expand quotes select policy to allow suppliers assigned via quote_suppliers
ALTER POLICY "quotes_select" ON public.quotes
USING (
  (get_user_role() = 'admin'::text)
  OR (client_id IN ( SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()))
  OR (supplier_id = get_current_user_supplier_id())
  OR (created_by = auth.uid())
  OR (EXISTS ( SELECT 1 FROM quote_responses qr WHERE qr.quote_id = quotes.id AND qr.supplier_id = get_current_user_supplier_id()))
  OR (EXISTS ( SELECT 1 FROM quote_suppliers qs WHERE qs.quote_id = quotes.id AND qs.supplier_id = get_current_user_supplier_id()))
);