-- ============================================
-- CORREÇÃO: Separar ID técnico (UUID) de código visual (RFQ)
-- ============================================

-- Objetivo: 
-- - id = UUID técnico interno (nunca mostrado ao usuário)
-- - local_code = RFQ01, RFQ02... (sempre mostrado ao usuário)

-- 1) Garantir que local_code seja obrigatório
-- Primeiro, preencher qualquer registro que ainda não tenha local_code
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN (
    SELECT id, client_id
    FROM public.quotes 
    WHERE local_code IS NULL
    ORDER BY client_id, created_at
  ) LOOP
    UPDATE public.quotes
    SET local_code = public.next_local_quote_code_by_client(rec.client_id, 'RFQ')
    WHERE id = rec.id;
  END LOOP;
END $$;

-- Agora tornar local_code obrigatório
ALTER TABLE public.quotes 
ALTER COLUMN local_code SET NOT NULL;

-- 2) Atualizar trigger para SEMPRE gerar UUID no id e RFQ no local_code
DROP TRIGGER IF EXISTS trg_quotes_set_id_and_local_code ON public.quotes;

CREATE OR REPLACE FUNCTION public.trg_quotes_set_id_and_local_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SEMPRE gerar UUID para id (técnico, interno)
  IF NEW.id IS NULL OR btrim(NEW.id) = '' THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  
  -- SEMPRE gerar local_code sequencial (visual, para usuário)
  IF NEW.local_code IS NULL OR btrim(NEW.local_code) = '' THEN
    NEW.local_code := public.next_local_quote_code_by_client(NEW.client_id, 'RFQ');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_quotes_set_id_and_local_code
BEFORE INSERT ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.trg_quotes_set_id_and_local_code();

-- 3) Verificação final
DO $$
DECLARE
  null_id_count INTEGER;
  null_local_code_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_id_count FROM public.quotes WHERE id IS NULL;
  SELECT COUNT(*) INTO null_local_code_count FROM public.quotes WHERE local_code IS NULL;
  SELECT COUNT(*) INTO total_count FROM public.quotes;
  
  IF null_id_count > 0 THEN
    RAISE WARNING '⚠️  % cotações sem ID de %', null_id_count, total_count;
  END IF;
  
  IF null_local_code_count > 0 THEN
    RAISE WARNING '⚠️  % cotações sem local_code de %', null_local_code_count, total_count;
  ELSE
    RAISE NOTICE '✅ Migração OK: % cotações com local_code obrigatório', total_count;
  END IF;
END $$;