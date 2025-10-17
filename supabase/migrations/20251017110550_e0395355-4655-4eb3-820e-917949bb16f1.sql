-- ============================================================
-- Consolidação completa: approve_offline_payment + RLS supplier
-- ============================================================

-- 1. Remover função antiga (se houver múltiplas definições)
DROP FUNCTION IF EXISTS public.approve_offline_payment(text, boolean, text);
DROP FUNCTION IF EXISTS public.approve_offline_payment(uuid, boolean, text);

-- 2. Criar função consolidada e segura
CREATE OR REPLACE FUNCTION public.approve_offline_payment(
  p_payment_id text,
  p_approved boolean,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_supplier_id uuid;
  v_new_status text;
  v_action_type text;
BEGIN
  -- Obter supplier_id do usuário atual
  v_supplier_id := get_current_user_supplier_id();
  
  IF v_supplier_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuário não é um fornecedor válido'
    );
  END IF;

  -- Buscar pagamento e validar ownership
  SELECT * INTO v_payment
  FROM payments
  WHERE id = p_payment_id
    AND supplier_id = v_supplier_id
    AND status = 'manual_confirmation';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Pagamento não encontrado ou não está aguardando confirmação'
    );
  END IF;

  -- Definir novo status e action
  IF p_approved THEN
    v_new_status := 'in_escrow';
    v_action_type := 'OFFLINE_PAYMENT_APPROVED';
  ELSE
    v_new_status := 'pending';
    v_action_type := 'OFFLINE_PAYMENT_REJECTED';
  END IF;

  -- Atualizar pagamento
  IF p_approved THEN
    UPDATE payments
    SET 
      status = v_new_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_notes,
      updated_at = now()
    WHERE id = p_payment_id;
  ELSE
    -- Rejeição: limpar dados offline e voltar para pending
    UPDATE payments
    SET 
      status = v_new_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_notes,
      offline_notes = NULL,
      offline_attachments = NULL,
      updated_at = now()
    WHERE id = p_payment_id;
  END IF;

  -- Registrar auditoria
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    panel_type,
    details
  ) VALUES (
    auth.uid(),
    v_action_type,
    'payments',
    p_payment_id,
    'supplier',
    jsonb_build_object(
      'approved', p_approved,
      'notes', p_notes,
      'previous_status', v_payment.status,
      'new_status', v_new_status
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', v_new_status,
    'message', CASE 
      WHEN p_approved THEN 'Pagamento confirmado com sucesso'
      ELSE 'Pagamento rejeitado'
    END
  );
END;
$$;

-- 3. Criar policy RLS específica para supplier confirmar/rejeitar
-- Permite UPDATE apenas quando:
-- - Módulo payments habilitado
-- - supplier_id = usuário atual
-- - status atual é manual_confirmation
-- - novo status é in_escrow ou pending
DROP POLICY IF EXISTS payments_supplier_confirm_offline ON public.payments;

CREATE POLICY payments_supplier_confirm_offline
ON public.payments
FOR UPDATE
TO authenticated
USING (
  user_has_module_access('payments'::text)
  AND supplier_id = get_current_user_supplier_id()
  AND status = 'manual_confirmation'
)
WITH CHECK (
  supplier_id = get_current_user_supplier_id()
  AND status IN ('in_escrow', 'pending')
);

-- 4. Validação final: garantir que não há triggers de financial_logs em payments
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'payments'
    AND t.tgname LIKE '%financial%';
  
  IF trigger_count > 0 THEN
    RAISE WARNING 'Encontrados % triggers de financial_logs em payments - removendo', trigger_count;
    
    -- Remover todos
    EXECUTE (
      SELECT string_agg(format('DROP TRIGGER IF EXISTS %I ON public.payments', tgname), '; ')
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE c.relname = 'payments'
        AND t.tgname LIKE '%financial%'
    );
  END IF;
END $$;

-- Comentários para documentação
COMMENT ON FUNCTION public.approve_offline_payment(text, boolean, text) IS 
'Função consolidada para fornecedor aprovar/rejeitar pagamento offline. Valida ownership, cria audit_log e retorna JSON estruturado.';

COMMENT ON POLICY payments_supplier_confirm_offline ON public.payments IS 
'Permite fornecedor atualizar payment de manual_confirmation para in_escrow/pending via approve_offline_payment';