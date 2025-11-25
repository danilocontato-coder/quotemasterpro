-- =====================================================
-- Remover constraint global errada de local_code
-- =====================================================
-- Esta migration remove a constraint UNIQUE global em quotes.local_code
-- que estava causando conflitos entre clientes diferentes.
-- 
-- A constraint correta quotes_client_local_code_unique (client_id, local_code)
-- permanece ativa, garantindo que cada cliente tenha sua própria
-- sequência independente de RFQ01, RFQ02, etc.
-- =====================================================

-- Remover a constraint global errada
ALTER TABLE quotes 
DROP CONSTRAINT IF EXISTS quotes_local_code_unique;

-- Verificar que a constraint correta por cliente existe
-- (não precisa criar, já existe no schema)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quotes_client_local_code_unique'
  ) THEN
    -- Se por algum motivo não existir, criar
    ALTER TABLE quotes 
    ADD CONSTRAINT quotes_client_local_code_unique UNIQUE (client_id, local_code);
  END IF;
END $$;

-- Verificar registros com TEMP_ que podem ter sido criados pela migration errada
DO $$
DECLARE
  temp_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO temp_count
  FROM quotes
  WHERE local_code LIKE 'TEMP_%';
  
  IF temp_count > 0 THEN
    RAISE NOTICE 'Encontrados % registros com local_code TEMP_* que precisam ser corrigidos', temp_count;
  END IF;
END $$;