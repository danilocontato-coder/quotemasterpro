-- Ajuste de RLS em public.payments para permitir atualização por admin, cliente e fornecedor (manual_confirmation)
-- 1) Remover policies conflitantes de UPDATE existentes
DROP POLICY IF EXISTS payments_supplier_confirm_offline ON public.payments;
DROP POLICY IF EXISTS payments_update ON public.payments;

-- 2) Criar uma única policy RESTRICTIVE de UPDATE cobrindo todos os casos válidos
CREATE POLICY payments_update_combined
ON public.payments
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  user_has_module_access('payments'::text)
  AND (
    get_user_role() = 'admin'::text
    OR client_id = get_current_user_client_id()
    OR (
      supplier_id = get_current_user_supplier_id()
      AND status = 'manual_confirmation'
    )
  )
)
WITH CHECK (
  get_user_role() = 'admin'::text
  OR client_id = get_current_user_client_id()
  OR (
    supplier_id = get_current_user_supplier_id()
    AND status IN ('in_escrow','pending')
  )
);