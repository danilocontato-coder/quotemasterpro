-- Remover a sequência global que está causando conflito
DROP SEQUENCE IF EXISTS public.quote_id_seq CASCADE;

-- Remover a função global de ID de cotação
DROP FUNCTION IF EXISTS public.next_quote_id(text);

-- Verificar e recriar o trigger correto para usar apenas IDs por cliente
DROP TRIGGER IF EXISTS trg_quotes_set_id ON public.quotes;

CREATE TRIGGER trg_quotes_set_id
  BEFORE INSERT OR UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_quotes_set_id();

-- Resetar os contadores para começar do 1 para cada cliente
UPDATE public.client_quote_counters SET current_counter = 0;

-- Verificar cotações existentes e atualizar contadores baseado no maior ID atual por cliente
WITH max_quote_numbers AS (
  SELECT 
    client_id,
    MAX(CAST(SUBSTRING(id FROM '[0-9]+') AS INTEGER)) as max_number
  FROM public.quotes 
  WHERE id ~ '^RFQ[0-9]+$'
  GROUP BY client_id
)
UPDATE public.client_quote_counters cqc
SET current_counter = COALESCE(mqn.max_number, 0)
FROM max_quote_numbers mqn
WHERE cqc.client_id = mqn.client_id;