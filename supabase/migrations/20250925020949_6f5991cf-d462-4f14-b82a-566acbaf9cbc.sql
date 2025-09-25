-- Adicionar campos para pagamento offline na tabela payments
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS offline_notes TEXT,
ADD COLUMN IF NOT EXISTS offline_attachments TEXT[];

-- Adicionar novos status de pagamento
COMMENT ON COLUMN public.payments.status IS 'Status: pending, processing, in_escrow, manual_confirmation, completed, failed, disputed, refunded';

-- Adicionar campos para aprovação manual de pagamentos offline
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS reviewed_by UUID,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Função para aprovar pagamento offline
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
BEGIN
  -- Buscar pagamento
  SELECT * INTO payment_record 
  FROM public.payments 
  WHERE id = p_payment_id AND status = 'manual_confirmation';
  
  IF payment_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Pagamento não encontrado ou já processado');
  END IF;
  
  -- Verificar se usuário é admin
  IF get_user_role() != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Sem permissão para aprovar pagamentos');
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
    CASE WHEN p_approved THEN 'Pagamento Aprovado' ELSE 'Pagamento Rejeitado' END,
    CASE WHEN p_approved 
      THEN 'Seu pagamento offline foi aprovado e confirmado.'
      ELSE 'Seu pagamento offline foi rejeitado. Entre em contato para mais informações.'
    END,
    CASE WHEN p_approved THEN 'success' ELSE 'error' END,
    'high',
    '/payments',
    jsonb_build_object('payment_id', payment_record.id, 'approved', p_approved)
  );
  
  RETURN json_build_object('success', true, 'message', 'Pagamento processado com sucesso');
END;
$$;