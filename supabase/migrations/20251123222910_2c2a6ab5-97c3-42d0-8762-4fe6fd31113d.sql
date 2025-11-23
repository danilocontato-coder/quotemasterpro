
-- =====================================================
-- CORREÇÃO 1: Atualizar trigger para considerar in_escrow como paid
-- =====================================================

DROP TRIGGER IF EXISTS trg_update_quote_status_on_payment ON public.payments;

CREATE OR REPLACE FUNCTION public.update_quote_status_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando pagamento muda para 'completed' OU 'in_escrow', atualizar cotação para 'paid'
  IF (OLD.status != 'completed' AND NEW.status = 'completed') OR
     (OLD.status != 'in_escrow' AND NEW.status = 'in_escrow') THEN
    UPDATE public.quotes
    SET 
      status = 'paid',
      updated_at = now()
    WHERE id = NEW.quote_id;
    
    -- Log de auditoria
    INSERT INTO public.audit_logs (
      action,
      entity_type,
      entity_id,
      details
    ) VALUES (
      'QUOTE_STATUS_AUTO_UPDATED',
      'quotes',
      NEW.quote_id,
      jsonb_build_object(
        'new_status', 'paid',
        'payment_id', NEW.id,
        'payment_status', NEW.status,
        'trigger', 'update_quote_status_on_payment'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_quote_status_on_payment
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quote_status_on_payment();

-- =====================================================
-- CORREÇÃO 2: Atualizar quotes que já têm pagamento em escrow
-- =====================================================

UPDATE public.quotes q
SET 
  status = 'paid',
  updated_at = now()
FROM public.payments p
WHERE p.quote_id = q.id
  AND p.status = 'in_escrow'
  AND q.status != 'paid';

-- Log de auditoria das correções
INSERT INTO public.audit_logs (
  action,
  entity_type,
  entity_id,
  details
)
SELECT 
  'QUOTE_STATUS_CORRECTED',
  'quotes',
  q.id,
  jsonb_build_object(
    'old_status', q.status,
    'new_status', 'paid',
    'payment_id', p.id,
    'payment_status', p.status,
    'reason', 'migration_fix_in_escrow'
  )
FROM public.quotes q
INNER JOIN public.payments p ON p.quote_id = q.id
WHERE p.status = 'in_escrow'
  AND q.status != 'paid';

-- =====================================================
-- CORREÇÃO 3: Renumerar cotações duplicadas RFQ13
-- =====================================================

-- Identificar e renumerar cotações duplicadas por cliente
WITH ranked_quotes AS (
  SELECT 
    id,
    client_id,
    local_code,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, local_code 
      ORDER BY created_at
    ) as rn
  FROM quotes
  WHERE local_code = 'RFQ13'
),
clients_with_rfq13 AS (
  SELECT DISTINCT client_id FROM ranked_quotes
),
max_counters AS (
  SELECT 
    client_id,
    COALESCE(
      MAX(CAST(SUBSTRING(local_code FROM 'RFQ(\d+)') AS INTEGER)),
      0
    ) as max_counter
  FROM quotes
  WHERE client_id IN (SELECT client_id FROM clients_with_rfq13)
    AND local_code ~ '^RFQ\d+$'
  GROUP BY client_id
)
UPDATE quotes q
SET 
  local_code = 'RFQ' || (mc.max_counter + rq.rn),
  updated_at = now()
FROM ranked_quotes rq
INNER JOIN max_counters mc ON mc.client_id = rq.client_id
WHERE q.id = rq.id
  AND rq.rn > 1;

-- Atualizar contadores dos clientes afetados
UPDATE client_quote_counters cqc
SET 
  current_counter = (
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(local_code FROM 'RFQ(\d+)') AS INTEGER)),
      0
    )
    FROM quotes q
    WHERE q.client_id = cqc.client_id
      AND q.local_code ~ '^RFQ\d+$'
  ),
  updated_at = now()
WHERE client_id IN (
  SELECT DISTINCT client_id 
  FROM quotes 
  WHERE local_code = 'RFQ13'
);

-- Log de auditoria das renumerações
INSERT INTO public.audit_logs (
  action,
  entity_type,
  entity_id,
  details
)
SELECT 
  'QUOTE_LOCAL_CODE_CORRECTED',
  'quotes',
  id,
  jsonb_build_object(
    'old_code', 'RFQ13',
    'new_code', local_code,
    'reason', 'migration_fix_duplicates',
    'client_id', client_id
  )
FROM quotes
WHERE local_code ~ '^RFQ1[4-9]$'
  AND updated_at >= (now() - interval '1 minute');

-- =====================================================
-- CORREÇÃO 4: Adicionar constraint para prevenir duplicação futura
-- =====================================================

-- Criar índice único para prevenir duplicação de local_code por cliente
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_client_local_code_unique 
  ON public.quotes(client_id, local_code)
  WHERE local_code IS NOT NULL;

COMMENT ON INDEX idx_quotes_client_local_code_unique IS 
  'Previne duplicação de códigos de cotação (local_code) dentro do mesmo cliente';
