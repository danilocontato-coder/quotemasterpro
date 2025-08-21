-- Add DELETE policy for products to allow authorized users to delete their own rows
CREATE POLICY products_delete
ON public.products
FOR DELETE
TO authenticated
USING (
  (public.get_user_role() = 'admin')
  OR (client_id IN (
    SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid()
  ))
  OR (supplier_id IN (
    SELECT profiles.supplier_id FROM public.profiles WHERE profiles.id = auth.uid()
  ))
);
