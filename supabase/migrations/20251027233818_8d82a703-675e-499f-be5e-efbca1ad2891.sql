-- Migration: Corrigir transição de status receiving → received
-- Problema: Trigger não reconhecia status 'submitted' como resposta válida

-- 1. Dropar trigger antigo
DROP TRIGGER IF EXISTS update_quote_responses_count_trigger ON quote_responses;

-- 2. Recriar função com lógica corrigida
CREATE OR REPLACE FUNCTION update_quote_responses_count_and_status()
RETURNS TRIGGER AS $$
DECLARE
  current_responses_count INTEGER;
  invited_suppliers_count INTEGER;
  new_status TEXT;
BEGIN
  -- Contar respostas válidas (incluindo 'submitted')
  current_responses_count := (
    SELECT COUNT(*) 
    FROM quote_responses qr 
    WHERE qr.quote_id = NEW.quote_id 
    AND qr.status IN ('sent', 'submitted')
  );

  -- Contar fornecedores convidados
  invited_suppliers_count := (
    SELECT COUNT(DISTINCT supplier_id)
    FROM quote_suppliers
    WHERE quote_id = NEW.quote_id
  );

  -- Determinar novo status
  new_status := CASE
    WHEN current_responses_count = 0 THEN 'receiving'
    WHEN current_responses_count < invited_suppliers_count THEN 'receiving'
    WHEN current_responses_count = invited_suppliers_count THEN 'received'
    ELSE 'receiving'
  END;

  -- Atualizar quote com novo status e contador
  UPDATE quotes 
  SET 
    responses_count = current_responses_count,
    status = new_status,
    updated_at = now()
  WHERE id = NEW.quote_id
  AND status = 'receiving';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recriar trigger
CREATE TRIGGER update_quote_responses_count_trigger
  AFTER INSERT OR UPDATE ON quote_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_responses_count_and_status();

-- 4. Corrigir RFQ03 manualmente (forçar recálculo)
UPDATE quotes 
SET 
  status = 'received',
  responses_count = (
    SELECT COUNT(*) 
    FROM quote_responses 
    WHERE quote_id = '9a087da3-07d0-4093-ae75-bd29ec5be7b6'
    AND status IN ('sent', 'submitted')
  ),
  updated_at = now()
WHERE id = '9a087da3-07d0-4093-ae75-bd29ec5be7b6'
AND local_code = 'RFQ03';

-- 5. Comentário de auditoria
COMMENT ON FUNCTION update_quote_responses_count_and_status() IS 
  'Atualiza contador de respostas e status da cotação. Corrigido em 2025-01-27 para aceitar status submitted e sent como respostas válidas.';