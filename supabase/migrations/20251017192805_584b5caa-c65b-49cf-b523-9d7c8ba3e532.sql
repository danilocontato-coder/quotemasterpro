-- Finalizar correção do fluxo offline: adicionar campos de transferência

-- Atualizar função approve_offline_payment para incluir campos de transferência
CREATE OR REPLACE FUNCTION public.approve_offline_payment(p_payment_id text, p_approved boolean, p_notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    v_new_status := 'completed';
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
      release_reason = 'supplier_confirmed_offline',
      transfer_status = 'completed',
      transfer_method = 'direct',
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
      'new_status', v_new_status,
      'payment_method', v_payment.payment_method
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', v_new_status,
    'message', CASE 
      WHEN p_approved THEN 'Pagamento confirmado como recebido'
      ELSE 'Pagamento rejeitado'
    END
  );
END;
$function$;