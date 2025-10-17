-- Permitir fornecedor marcar pagamentos in_escrow como recebidos manualmente

CREATE OR REPLACE FUNCTION public.mark_payment_as_manually_received(
  p_payment_id text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payment RECORD;
  v_supplier_id uuid;
BEGIN
  -- Verificar se é fornecedor
  v_supplier_id := get_current_user_supplier_id();
  
  IF v_supplier_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuário não é um fornecedor válido'
    );
  END IF;

  -- Buscar pagamento
  SELECT * INTO v_payment
  FROM payments
  WHERE id = p_payment_id
    AND supplier_id = v_supplier_id
    AND status = 'in_escrow';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Pagamento não encontrado ou já processado'
    );
  END IF;

  -- Atualizar para completed
  UPDATE payments
  SET 
    status = 'completed',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_notes = COALESCE(p_notes, 'Recebimento manual confirmado pelo fornecedor'),
    updated_at = now()
  WHERE id = p_payment_id;

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
    'PAYMENT_MANUALLY_CONFIRMED',
    'payments',
    p_payment_id,
    'supplier',
    jsonb_build_object(
      'notes', p_notes,
      'previous_status', v_payment.status,
      'new_status', 'completed'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'completed',
    'message', 'Pagamento confirmado como recebido manualmente'
  );
END;
$function$;