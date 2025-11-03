-- Corrigir notify_new_quote para usar local_code ao invés de UUID
CREATE OR REPLACE FUNCTION public.notify_new_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notificar usuários do cliente sobre nova cotação usando local_code (RFQ)
  PERFORM public.notify_client_users(
    NEW.client_id,
    'Nova Cotação Criada',
    'A cotação #' || COALESCE(NEW.local_code, NEW.id) || ' foi criada: ' || NEW.title,
    'quote',
    'normal',
    '/quotes',
    jsonb_build_object('quote_id', NEW.id, 'quote_title', NEW.title, 'quote_code', NEW.local_code)
  );
  
  RETURN NEW;
END;
$$;