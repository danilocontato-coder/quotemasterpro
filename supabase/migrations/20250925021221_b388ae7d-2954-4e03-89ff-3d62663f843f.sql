-- Corrigir função para aprovação pelo fornecedor
CREATE OR REPLACE FUNCTION public.approve_offline_payment(
  p_payment_id TEXT,
  p_approved BOOLEAN,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  payment_record RECORD;
  new_status TEXT;
  current_supplier_id UUID;
BEGIN
  -- Buscar pagamento
  SELECT * INTO payment_record 
  FROM public.payments 
  WHERE id = p_payment_id AND status = 'manual_confirmation';
  
  IF payment_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Pagamento não encontrado ou já processado');
  END IF;
  
  -- Obter ID do fornecedor do usuário atual
  current_supplier_id := get_current_user_supplier_id();
  
  -- Verificar se usuário é o fornecedor do pagamento ou admin
  IF current_supplier_id != payment_record.supplier_id AND get_user_role() != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Apenas o fornecedor responsável pode aprovar este pagamento');
  END IF;
  
  -- Definir novo status
  new_status := CASE WHEN p_approved THEN 'in_escrow' ELSE 'failed' END;
  
  -- Atualizar pagamento
  UPDATE public.payments 
  SET 
    status = new_status,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_notes = p_notes,
    updated_at = now()
  WHERE id = p_payment_id;
  
  -- Se aprovado, criar entrega
  IF p_approved THEN
    INSERT INTO public.deliveries (
      payment_id,
      quote_id,
      client_id,
      supplier_id,
      status
    ) VALUES (
      payment_record.id,
      payment_record.quote_id,
      payment_record.client_id,
      payment_record.supplier_id,
      'pending'
    );
  END IF;
  
  -- Notificar cliente
  PERFORM public.notify_client_users(
    payment_record.client_id,
    CASE WHEN p_approved THEN 'Pagamento Confirmado pelo Fornecedor' ELSE 'Pagamento Rejeitado pelo Fornecedor' END,
    CASE WHEN p_approved 
      THEN 'O fornecedor confirmou o recebimento do seu pagamento offline.'
      ELSE 'O fornecedor não confirmou o recebimento do pagamento. Entre em contato para esclarecer.'
    END,
    CASE WHEN p_approved THEN 'success' ELSE 'error' END,
    'high',
    '/payments',
    jsonb_build_object('payment_id', payment_record.id, 'approved', p_approved)
  );
  
  RETURN json_build_object('success', true, 'message', 'Pagamento processado com sucesso');
END;
$$;