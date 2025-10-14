-- Criar trigger para preencher client_name automaticamente em quotes
-- O client_name deve ser populado com o nome real do cliente da tabela clients

CREATE OR REPLACE FUNCTION public.trg_quotes_set_client_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-preencher client_name se estiver vazio ou null
  IF NEW.client_name IS NULL OR btrim(NEW.client_name) = '' OR NEW.client_name = 'Cliente' THEN
    NEW.client_name := (
      SELECT COALESCE(c.name, c.company_name, 'Cliente não identificado')
      FROM public.clients c
      WHERE c.id = NEW.client_id
      LIMIT 1
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger BEFORE INSERT e UPDATE
DROP TRIGGER IF EXISTS trg_quotes_set_client_name ON public.quotes;

CREATE TRIGGER trg_quotes_set_client_name
  BEFORE INSERT OR UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_quotes_set_client_name();

-- Atualizar cotações existentes que têm client_name genérico
UPDATE public.quotes q
SET client_name = COALESCE(c.name, c.company_name, 'Cliente não identificado')
FROM public.clients c
WHERE q.client_id = c.id
  AND (q.client_name IS NULL OR q.client_name = '' OR q.client_name = 'Cliente');