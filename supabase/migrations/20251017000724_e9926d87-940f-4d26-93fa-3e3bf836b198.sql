-- ============================================
-- BACKFILL: IDs Amigáveis e Valores (Corrigido)
-- ============================================

-- Fase 1: Encontrar o próximo número disponível globalmente
DO $$
DECLARE
  max_num INTEGER;
  payment_rec RECORD;
  new_id TEXT;
  counter INTEGER := 0;
BEGIN
  -- Encontrar o maior número já usado em IDs #PG
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(id FROM '#PG(\d+)') AS INTEGER
      )
    ), 
    0
  ) INTO max_num
  FROM public.payments
  WHERE id ~ '^#PG\d+$';
  
  counter := max_num;
  
  -- Atualizar cada pagamento antigo
  FOR payment_rec IN 
    SELECT id, client_id 
    FROM public.payments
    WHERE id LIKE 'PAY-%'
    ORDER BY created_at
  LOOP
    counter := counter + 1;
    new_id := '#PG' || LPAD(counter::TEXT, 3, '0');
    
    -- Atualizar ID
    UPDATE public.payments 
    SET id = new_id 
    WHERE id = payment_rec.id;
    
    -- Log de auditoria
    INSERT INTO public.audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      panel_type,
      details
    ) VALUES (
      NULL,
      'PAYMENT_BACKFILL_ID',
      'payments',
      new_id,
      'system',
      jsonb_build_object(
        'old_id', payment_rec.id,
        'new_id', new_id,
        'client_id', payment_rec.client_id,
        'reason', 'Migração para IDs amigáveis'
      )
    );
  END LOOP;
END $$;

-- Fase 2: Recalcular valores zerados
WITH calculated_amounts AS (
  SELECT 
    p.id,
    COALESCE(
      (SELECT qr.total_amount 
       FROM public.quote_responses qr
       WHERE qr.quote_id = p.quote_id 
         AND qr.supplier_id = p.supplier_id
         AND qr.status IN ('approved', 'selected')
       ORDER BY CASE qr.status WHEN 'approved' THEN 1 ELSE 2 END
       LIMIT 1),
      (SELECT q.total 
       FROM public.quotes q 
       WHERE q.id = p.quote_id AND q.total > 0
       LIMIT 1),
      (SELECT SUM(qi.quantity * qi.unit_price)
       FROM public.quote_items qi
       WHERE qi.quote_id = p.quote_id),
      0
    ) AS new_amount
  FROM public.payments p
  WHERE p.amount IS NULL OR p.amount <= 0
)
UPDATE public.payments p
SET 
  amount = ca.new_amount,
  updated_at = now()
FROM calculated_amounts ca
WHERE p.id = ca.id AND ca.new_amount > 0;

-- Fase 3: Log de valores corrigidos
INSERT INTO public.audit_logs (
  user_id, action, entity_type, entity_id, panel_type, details
)
SELECT 
  NULL,
  'PAYMENT_BACKFILL_AMOUNT',
  'payments',
  p.id,
  'system',
  jsonb_build_object(
    'payment_id', p.id,
    'new_amount', p.amount,
    'quote_id', p.quote_id
  )
FROM public.payments p
WHERE p.updated_at >= (now() - interval '10 seconds') AND p.amount > 0;