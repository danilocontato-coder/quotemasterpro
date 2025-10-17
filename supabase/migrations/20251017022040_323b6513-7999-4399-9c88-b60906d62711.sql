-- Atualizar função para incluir notificação de pagamento offline
CREATE OR REPLACE FUNCTION public.notify_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote_local_code TEXT;
BEGIN
  -- Só notificar se o status mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Buscar local_code da cotação
  SELECT local_code INTO quote_local_code
  FROM public.quotes
  WHERE id = NEW.quote_id;
  
  CASE NEW.status
    WHEN 'completed' THEN
      PERFORM public.notify_client_users(
        NEW.client_id,
        'Pagamento Confirmado',
        'O pagamento da cotação #' || COALESCE(quote_local_code, NEW.quote_id) || ' foi confirmado',
        'payment',
        'normal',
        '/payments',
        jsonb_build_object('payment_id', NEW.id, 'quote_id', NEW.quote_id, 'amount', NEW.amount)
      );
    WHEN 'failed' THEN
      PERFORM public.notify_client_users(
        NEW.client_id,
        'Falha no Pagamento',
        'O pagamento da cotação #' || COALESCE(quote_local_code, NEW.quote_id) || ' falhou. Verifique os dados e tente novamente',
        'error',
        'high',
        '/payments',
        jsonb_build_object('payment_id', NEW.id, 'quote_id', NEW.quote_id, 'amount', NEW.amount)
      );
    WHEN 'manual_confirmation' THEN
      PERFORM public.notify_client_users(
        NEW.client_id,
        'Pagamento Offline Registrado',
        'Seu pagamento offline para a cotação #' || COALESCE(quote_local_code, NEW.quote_id) || ' foi registrado e está aguardando confirmação',
        'info',
        'normal',
        '/payments',
        jsonb_build_object('payment_id', NEW.id, 'quote_id', NEW.quote_id, 'amount', NEW.amount)
      );
    ELSE
      -- Cláusula ELSE para evitar erro "case not found"
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$;