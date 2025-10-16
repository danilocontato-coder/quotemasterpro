-- ============================================
-- ETAPA 1: Corrigir Trigger de ID Amigável
-- ============================================

CREATE OR REPLACE FUNCTION public.trg_payments_set_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Gerar ID amigável se estiver vazio, null ou no formato antigo PAY-{uuid}
  IF NEW.id IS NULL OR btrim(NEW.id) = '' OR NEW.id LIKE 'PAY-%' THEN
    NEW.id := '#' || public.next_payment_id_by_client(NEW.client_id, 'PG');
  END IF;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.trg_payments_set_id() IS 
'Gera IDs amigáveis no formato #PG001, #PG002, etc. usando contador sequencial por cliente';