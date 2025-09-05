-- Corrigir a lógica do trigger para considerar tanto responses_count quanto suppliers_sent_count
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
        WHEN status = 'sent' THEN
          CASE 
            WHEN (SELECT COUNT(*) FROM public.quote_responses WHERE quote_id = NEW.quote_id) >= COALESCE(suppliers_sent_count, 1)
            THEN 'received'
            ELSE 'receiving'
          END
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
        WHEN (SELECT COUNT(*) FROM public.quote_responses WHERE quote_id = OLD.quote_id) >= COALESCE(suppliers_sent_count, 1)
        THEN 'received'
        ELSE 'receiving'
      END,
      updated_at = now()
    WHERE id = OLD.quote_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Atualizar manualmente os status das cotações existentes
UPDATE public.quotes 
SET status = CASE 
  WHEN responses_count = 0 THEN 'sent'
  WHEN responses_count >= COALESCE(suppliers_sent_count, 1) THEN 'received'
  ELSE 'receiving'
END,
updated_at = now()
WHERE status IN ('sent', 'receiving');

-- Log da correção
INSERT INTO public.audit_logs (
  action, 
  entity_type, 
  entity_id, 
  panel_type, 
  details
) VALUES (
  'SYSTEM_STATUS_CORRECTION',
  'quotes',
  'bulk',
  'system',
  '{"message": "Status das cotações corrigidos automaticamente baseado no número de respostas vs fornecedores enviados"}'::jsonb
);