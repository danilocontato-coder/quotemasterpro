-- ========================================
-- MIGRATION: Corrigir valores de frete em quote_responses, quotes e payments
-- ========================================

-- 1. Atualizar quote_responses.total_amount para incluir shipping_cost
UPDATE quote_responses
SET 
  total_amount = (
    SELECT COALESCE(SUM((item->>'total')::numeric), 0)
    FROM jsonb_array_elements(items) AS item
  ) + COALESCE(shipping_cost, 0)
WHERE shipping_cost > 0 
  AND (
    total_amount IS NULL
    OR total_amount < (
      SELECT COALESCE(SUM((item->>'total')::numeric), 0) + COALESCE(shipping_cost, 0)
      FROM jsonb_array_elements(items) AS item
    )
  );

-- 2. Atualizar quotes.total baseado na resposta aprovada
UPDATE quotes q
SET 
  total = (
    SELECT qr.total_amount
    FROM quote_responses qr
    WHERE qr.quote_id = q.id
      AND qr.status = 'approved'
    ORDER BY qr.created_at DESC
    LIMIT 1
  ),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 
  FROM quote_responses qr
  WHERE qr.quote_id = q.id
    AND qr.status = 'approved'
    AND qr.total_amount IS NOT NULL
    AND ABS(COALESCE(q.total, 0) - qr.total_amount) > 0.01
);

-- 3. Atualizar payments.amount baseado na quote_response aprovada
UPDATE payments p
SET 
  amount = (
    SELECT qr.total_amount
    FROM quote_responses qr
    WHERE qr.quote_id = p.quote_id
      AND qr.supplier_id = p.supplier_id
      AND qr.status = 'approved'
    ORDER BY qr.created_at DESC
    LIMIT 1
  ),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 
  FROM quote_responses qr
  WHERE qr.quote_id = p.quote_id
    AND qr.supplier_id = p.supplier_id
    AND qr.status = 'approved'
    AND qr.total_amount IS NOT NULL
    AND ABS(p.amount - qr.total_amount) > 0.01
);

-- 4. Criar trigger para atualizar quotes.total automaticamente ao aprovar quote_response
CREATE OR REPLACE FUNCTION update_quote_total_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando quote_response muda para 'approved', atualizar quotes.total
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE quotes
    SET 
      total = NEW.total_amount,
      supplier_id = NEW.supplier_id,
      updated_at = NOW()
    WHERE id = NEW.quote_id;
    
    RAISE LOG 'Quote % total atualizado para % (supplier %)', 
      NEW.quote_id, NEW.total_amount, NEW.supplier_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger (drop primeiro se já existir)
DROP TRIGGER IF EXISTS trg_update_quote_total_on_approval ON quote_responses;

CREATE TRIGGER trg_update_quote_total_on_approval
  AFTER INSERT OR UPDATE OF status
  ON quote_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_total_on_approval();