-- =====================================================
-- Migração: Corrigir duplicatas e adicionar constraint UNIQUE no local_code
-- =====================================================

-- 1. Identificar e renumerar duplicatas preservando o mais recente
WITH duplicates AS (
  SELECT 
    id,
    local_code,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY local_code ORDER BY created_at DESC) as rn,
    client_id
  FROM quotes
  WHERE local_code IS NOT NULL
),
to_renumber AS (
  SELECT id, local_code, client_id
  FROM duplicates
  WHERE rn > 1  -- Todos exceto o mais recente de cada código
)
UPDATE quotes
SET local_code = 'TEMP_' || id::text  -- Usar prefixo temporário para evitar conflitos
WHERE id IN (SELECT id FROM to_renumber);

-- 2. Adicionar constraint UNIQUE no local_code
ALTER TABLE quotes 
ADD CONSTRAINT quotes_local_code_unique UNIQUE (local_code);

-- 3. Listar registros que foram renumerados (para log)
SELECT 
  id,
  local_code,
  title,
  created_at
FROM quotes
WHERE local_code LIKE 'TEMP_%'
ORDER BY created_at DESC;