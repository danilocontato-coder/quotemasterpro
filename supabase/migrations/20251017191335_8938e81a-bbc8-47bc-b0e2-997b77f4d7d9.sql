-- Criar trigger para atualizar status da cotação quando pagamento for confirmado

CREATE OR REPLACE FUNCTION public.update_quote_status_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Quando pagamento muda para 'completed', atualizar cotação para 'paid'
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    UPDATE public.quotes
    SET 
      status = 'paid',
      updated_at = now()
    WHERE id = NEW.quote_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_update_quote_on_payment ON public.payments;

CREATE TRIGGER trg_update_quote_on_payment
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_quote_status_on_payment();