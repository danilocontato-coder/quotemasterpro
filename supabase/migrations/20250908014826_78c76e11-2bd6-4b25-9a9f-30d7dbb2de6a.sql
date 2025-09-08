-- Criar função para trigger de IA automática
CREATE OR REPLACE FUNCTION public.trigger_ai_negotiation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Se a cotação mudou para 'received', criar análise da IA
  IF OLD.status != 'received' AND NEW.status = 'received' THEN
    -- Inserir registro de negociação IA
    INSERT INTO public.ai_negotiations (quote_id, original_amount, status)
    VALUES (NEW.id, COALESCE(NEW.total, 0), 'analyzing');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger para iniciar negociação automática
CREATE TRIGGER trigger_ai_negotiation_on_quote_received
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_ai_negotiation();