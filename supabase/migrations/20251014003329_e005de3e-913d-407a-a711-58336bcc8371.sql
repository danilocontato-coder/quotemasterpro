-- ============================================================================
-- FIX: Remover triggers duplicados que causam pulo na numeração RFQ
-- ============================================================================

-- 1) Dropar triggers legados (podem existir com nomes diferentes)
DROP TRIGGER IF EXISTS trg_quotes_set_id ON public.quotes;
DROP TRIGGER IF EXISTS quotes_set_id_before_insert ON public.quotes;

-- 2) Dropar função antiga (após remover os triggers que dependem dela)
DROP FUNCTION IF EXISTS public.trg_quotes_set_id();

-- 3) Re-sincronizar contadores com o maior local_code existente por cliente
-- Extrair o número do formato RFQxx e atualizar current_counter
DO $$
DECLARE
  client_rec RECORD;
  max_num INTEGER;
BEGIN
  -- Para cada cliente que tem cotações
  FOR client_rec IN 
    SELECT DISTINCT client_id 
    FROM public.quotes 
    WHERE client_id IS NOT NULL
  LOOP
    -- Encontrar o maior número de local_code para este cliente
    SELECT COALESCE(
      MAX(
        CAST(
          REGEXP_REPLACE(local_code, '[^0-9]', '', 'g') AS INTEGER
        )
      ), 
      0
    ) INTO max_num
    FROM public.quotes
    WHERE client_id = client_rec.client_id 
      AND local_code IS NOT NULL
      AND local_code ~ '^RFQ[0-9]+$';
    
    -- Inserir ou atualizar o contador
    INSERT INTO public.client_quote_counters (client_id, current_counter, updated_at)
    VALUES (client_rec.client_id, max_num, NOW())
    ON CONFLICT (client_id) 
    DO UPDATE SET 
      current_counter = GREATEST(client_quote_counters.current_counter, max_num),
      updated_at = NOW();
  END LOOP;
END $$;

-- 4) Garantir que apenas o trigger correto existe
DROP TRIGGER IF EXISTS trg_quotes_set_id_and_local_code ON public.quotes;

CREATE TRIGGER trg_quotes_set_id_and_local_code
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_quotes_set_id_and_local_code();

-- 5) Verificação: Listar triggers ativos na tabela quotes
-- (apenas para info, não afeta a migração)
COMMENT ON TRIGGER trg_quotes_set_id_and_local_code ON public.quotes IS 
  'Único trigger responsável por gerar id (UUID) e local_code (RFQxx sequencial)';

-- ============================================================================
-- VERIFICAÇÃO MANUAL (rodar após migration):
-- 
-- SELECT tgname, tgrelid::regclass, proname 
-- FROM pg_trigger t
-- JOIN pg_proc p ON t.tgfoid = p.oid
-- WHERE tgrelid = 'public.quotes'::regclass AND NOT tgisinternal;
--
-- SELECT client_id, current_counter FROM public.client_quote_counters 
-- ORDER BY updated_at DESC LIMIT 10;
-- ============================================================================