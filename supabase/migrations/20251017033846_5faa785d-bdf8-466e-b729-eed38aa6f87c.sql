-- Adicionar notificação quando fornecedor aprova pagamento offline
CREATE OR REPLACE FUNCTION notify_payment_approved()
RETURNS TRIGGER AS $$
DECLARE
  v_quote_title TEXT;
  v_payment_amount NUMERIC;
BEGIN
  -- Apenas para mudanças de manual_confirmation para in_escrow
  IF OLD.status = 'manual_confirmation' AND NEW.status = 'in_escrow' THEN
    -- Buscar informações da cotação
    SELECT title, NEW.amount INTO v_quote_title, v_payment_amount
    FROM quotes
    WHERE id = NEW.quote_id;
    
    -- Notificar usuários do cliente
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      priority,
      action_url,
      metadata
    )
    SELECT 
      p.id,
      '💰 Pagamento Confirmado',
      'O fornecedor confirmou o recebimento de R$ ' || NEW.amount::TEXT || ' para ' || COALESCE(v_quote_title, 'cotação'),
      'payment',
      'normal',
      '/client/payments',
      jsonb_build_object(
        'payment_id', NEW.id,
        'quote_id', NEW.quote_id,
        'amount', NEW.amount,
        'status', 'in_escrow'
      )
    FROM public.profiles p
    WHERE p.client_id = NEW.client_id
      AND p.active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_notify_payment_approved ON public.payments;
CREATE TRIGGER trg_notify_payment_approved
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_approved();