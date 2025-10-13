-- Corrigir trigger de quotes para evitar duplicação de IDs
-- O problema é que o trigger está rodando em UPDATE também, causando conflitos

DROP TRIGGER IF EXISTS trg_quotes_set_id ON public.quotes;

-- Recriar trigger APENAS para INSERT (não para UPDATE)
CREATE TRIGGER trg_quotes_set_id
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_quotes_set_id();