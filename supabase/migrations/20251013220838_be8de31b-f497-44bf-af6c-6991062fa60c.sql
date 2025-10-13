-- ============================================
-- MIGRAÇÃO: Numeração de RFQ por Cliente (v2 - com limpeza)
-- ============================================

-- 1) Adicionar coluna local_code se não existir
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS local_code TEXT;

-- 2) Remover dados antigos de local_code para recriar limpo
UPDATE public.quotes SET local_code = NULL WHERE local_code IS NOT NULL;

-- 3) Resetar contadores para começar do zero
DELETE FROM public.client_quote_counters;

-- 4) Criar constraint de unicidade por cliente (drop se existir)
ALTER TABLE public.quotes 
DROP CONSTRAINT IF EXISTS quotes_client_local_code_unique;

ALTER TABLE public.quotes 
ADD CONSTRAINT quotes_client_local_code_unique 
UNIQUE (client_id, local_code);

-- 5) Criar índice composto para performance
DROP INDEX IF EXISTS idx_quotes_client_local_code;
CREATE INDEX idx_quotes_client_local_code 
ON public.quotes(client_id, local_code);

-- 6) Criar função para gerar local_code sequencial por cliente
CREATE OR REPLACE FUNCTION public.next_local_quote_code_by_client(
  p_client_id UUID, 
  prefix TEXT DEFAULT 'RFQ'
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
  code_text TEXT;
BEGIN
  INSERT INTO public.client_quote_counters (client_id, current_counter)
  VALUES (p_client_id, 1)
  ON CONFLICT (client_id) 
  DO UPDATE SET 
    current_counter = client_quote_counters.current_counter + 1,
    updated_at = now()
  RETURNING current_counter INTO n;
  
  code_text := prefix || lpad(n::text, 2, '0');
  RETURN code_text;
END;
$$;

-- 7) Substituir trigger existente
DROP TRIGGER IF EXISTS trg_quotes_set_id ON public.quotes;
DROP TRIGGER IF EXISTS trg_quotes_set_id_and_local_code ON public.quotes;

CREATE OR REPLACE FUNCTION public.trg_quotes_set_id_and_local_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Gerar ID técnico global como UUID se vazio
  IF NEW.id IS NULL OR btrim(NEW.id) = '' THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  
  -- Gerar local_code se vazio
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

-- 8) Preencher local_code para registros existentes por cliente em ordem cronológica
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

-- 9) Verificação final
DO $$
DECLARE
  null_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM public.quotes WHERE local_code IS NULL;
  SELECT COUNT(*) INTO total_count FROM public.quotes;
  
  IF null_count > 0 THEN
    RAISE WARNING '⚠️  % cotações ainda sem local_code de %', null_count, total_count;
  ELSE
    RAISE NOTICE '✅ Migração OK: % cotações com local_code', total_count;
  END IF;
END $$;