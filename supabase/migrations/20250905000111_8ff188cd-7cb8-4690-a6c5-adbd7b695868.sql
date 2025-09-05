-- Atualizar função para mudar status automaticamente quando há apenas 1 proposta
CREATE OR REPLACE FUNCTION public.update_quote_responses_count_and_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.quotes
    SET 
      responses_count = (
        SELECT COUNT(*) FROM public.quote_responses WHERE quote_id = NEW.quote_id
      ),
      status = CASE 
        WHEN status = 'sent' AND (SELECT COUNT(*) FROM public.quote_responses WHERE quote_id = NEW.quote_id) = 1 
        THEN 'received'
        WHEN status = 'sent' AND (SELECT COUNT(*) FROM public.quote_responses WHERE quote_id = NEW.quote_id) > 1 
        THEN 'receiving'
        ELSE status 
      END,
      updated_at = now()
    WHERE id = NEW.quote_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.quotes
    SET 
      responses_count = (
        SELECT COUNT(*) FROM public.quote_responses WHERE quote_id = OLD.quote_id
      ),
      status = CASE 
        WHEN (SELECT COUNT(*) FROM public.quote_responses WHERE quote_id = OLD.quote_id) = 0 
        THEN 'sent'
        WHEN (SELECT COUNT(*) FROM public.quote_responses WHERE quote_id = OLD.quote_id) = 1 
        THEN 'received'
        WHEN (SELECT COUNT(*) FROM public.quote_responses WHERE quote_id = OLD.quote_id) > 1 
        THEN 'receiving'
        ELSE status 
      END,
      updated_at = now()
    WHERE id = OLD.quote_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trg_update_quote_responses_count ON public.quote_responses;

-- Criar novo trigger com lógica atualizada
CREATE TRIGGER trg_update_quote_responses_count_and_status
  AFTER INSERT OR DELETE ON public.quote_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quote_responses_count_and_status();