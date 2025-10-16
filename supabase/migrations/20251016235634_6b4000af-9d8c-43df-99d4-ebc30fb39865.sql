-- ============================================
-- FASE 1: Corrigir Dados Existentes
-- ============================================

-- Atualizar quotes.supplier_id baseado em qualquer resposta existente
-- (priorizar respostas selected/approved, mas aceitar qualquer resposta se não houver)
UPDATE quotes q
SET supplier_id = COALESCE(
  (SELECT qr.supplier_id 
   FROM quote_responses qr 
   WHERE qr.quote_id = q.id 
     AND qr.status IN ('selected', 'approved') 
   LIMIT 1),
  (SELECT qr.supplier_id 
   FROM quote_responses qr 
   WHERE qr.quote_id = q.id 
   ORDER BY qr.created_at DESC 
   LIMIT 1)
),
updated_at = now()
WHERE q.supplier_id IS NULL
  AND q.status = 'approved'
  AND EXISTS (SELECT 1 FROM quote_responses WHERE quote_id = q.id);

-- Atualizar payments.supplier_id baseado na cotação corrigida
UPDATE payments p
SET supplier_id = q.supplier_id,
    updated_at = now()
FROM quotes q
WHERE p.quote_id = q.id
  AND p.supplier_id IS NULL
  AND q.supplier_id IS NOT NULL;

-- ============================================
-- FASE 2: Trigger para Atualizar supplier_id Automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION trg_update_quote_supplier_on_selection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se a resposta foi marcada como 'selected' ou 'approved'
  IF NEW.status IN ('selected', 'approved') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    -- Atualizar o supplier_id na cotação
    UPDATE quotes
    SET supplier_id = NEW.supplier_id,
        updated_at = now()
    WHERE id = NEW.quote_id;
    
    -- Log para auditoria
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      panel_type,
      details
    ) VALUES (
      auth.uid(),
      'QUOTE_SUPPLIER_AUTO_LINKED',
      'quotes',
      NEW.quote_id,
      'system',
      jsonb_build_object(
        'supplier_id', NEW.supplier_id,
        'quote_response_id', NEW.id,
        'response_status', NEW.status,
        'auto_linked', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger na tabela quote_responses
DROP TRIGGER IF EXISTS trg_quote_response_selection ON quote_responses;
CREATE TRIGGER trg_quote_response_selection
AFTER UPDATE ON quote_responses
FOR EACH ROW
EXECUTE FUNCTION trg_update_quote_supplier_on_selection();