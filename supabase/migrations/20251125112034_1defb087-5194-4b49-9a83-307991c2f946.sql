-- Resetar confirmação que falhou devido ao bug do release-escrow-payment
-- Código 047145 foi marcado como usado mas o pagamento não foi liberado

-- 1. Desmarcar código como usado
UPDATE delivery_confirmations
SET 
  is_used = false,
  confirmed_at = NULL,
  confirmed_by = NULL
WHERE confirmation_code = '047145'
  AND is_used = true;

-- 2. Reverter status da entrega para in_transit
UPDATE deliveries
SET 
  status = 'in_transit',
  actual_delivery_date = NULL
WHERE id = (
  SELECT delivery_id 
  FROM delivery_confirmations 
  WHERE confirmation_code = '047145'
)
  AND status = 'delivered';

-- 3. Log de auditoria
INSERT INTO audit_logs (action, entity_type, entity_id, panel_type, details)
SELECT 
  'DELIVERY_CONFIRMATION_RESET',
  'deliveries',
  d.id,
  'system',
  jsonb_build_object(
    'reason', 'Reset devido a falha na liberação de escrow',
    'confirmation_code', '047145',
    'payment_id', p.id,
    'payment_status', p.status
  )
FROM deliveries d
JOIN delivery_confirmations dc ON dc.delivery_id = d.id
JOIN payments p ON p.quote_id = d.quote_id
WHERE dc.confirmation_code = '047145';