-- Criar política para fornecedores acessarem comprovantes de pagamentos offline
CREATE POLICY "Fornecedores podem ver comprovantes de seus pagamentos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = 'payments'
  AND EXISTS (
    SELECT 1 
    FROM public.payments p
    WHERE p.id = (storage.foldername(name))[2]
    AND p.supplier_id = get_current_user_supplier_id()
  )
);