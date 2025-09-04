-- Primeiro, vamos atualizar manualmente os responses_count existentes
UPDATE quotes 
SET responses_count = (
  SELECT COUNT(*) 
  FROM quote_responses 
  WHERE quote_id = quotes.id
)
WHERE id IN ('RFQ03', 'RFQ02');

-- Verificar se o trigger existe
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger 
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgname = 'trigger_update_quote_responses_count';

-- Recriar o trigger com configuração mais robusta
DROP TRIGGER IF EXISTS trigger_update_quote_responses_count ON quote_responses;

CREATE OR REPLACE FUNCTION update_quote_responses_count()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new quote_response is inserted
  IF TG_OP = 'INSERT' THEN
    -- Log the operation
    RAISE NOTICE 'Trigger fired: INSERT for quote_id %', NEW.quote_id;
    
    UPDATE quotes 
    SET 
      responses_count = (
        SELECT COUNT(*) 
        FROM quote_responses 
        WHERE quote_id = NEW.quote_id
      ),
      status = CASE 
        WHEN status = 'sent' THEN 'receiving'
        ELSE status
      END,
      updated_at = now()
    WHERE id = NEW.quote_id;
    
    RETURN NEW;
  END IF;
  
  -- When a quote_response is deleted
  IF TG_OP = 'DELETE' THEN
    -- Log the operation
    RAISE NOTICE 'Trigger fired: DELETE for quote_id %', OLD.quote_id;
    
    UPDATE quotes 
    SET 
      responses_count = (
        SELECT COUNT(*) 
        FROM quote_responses 
        WHERE quote_id = OLD.quote_id
      ),
      updated_at = now()
    WHERE id = OLD.quote_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;