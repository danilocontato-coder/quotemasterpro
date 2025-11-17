-- ========================================
-- FASE 5: Correção do Pagamento PAY002
-- ========================================
-- Resetar pagamento PAY002 para fluxo correto de escrow
-- (somente se ainda não foi entregue)

-- Primeiro, desabilitar temporariamente o trigger para evitar notificação duplicada
ALTER TABLE payments DISABLE TRIGGER trg_notify_supplier_payment_in_escrow;

-- Resetar pagamento para in_escrow
UPDATE payments 
SET 
  status = 'in_escrow',
  updated_at = now()
WHERE id = 'PAY002' 
  AND status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM deliveries 
    WHERE deliveries.payment_id = 'PAY002' 
    AND deliveries.status = 'delivered'
  );

-- Atualizar cotação relacionada para 'approved'
UPDATE quotes 
SET 
  status = 'approved',
  updated_at = now()
WHERE id IN (
  SELECT quote_id FROM payments WHERE id = 'PAY002'
)
AND status = 'paid'
AND NOT EXISTS (
  SELECT 1 FROM deliveries 
  WHERE deliveries.quote_id = quotes.id 
  AND deliveries.status = 'delivered'
);

-- Reabilitar trigger
ALTER TABLE payments ENABLE TRIGGER trg_notify_supplier_payment_in_escrow;

-- Log de auditoria
INSERT INTO audit_logs (
  action,
  entity_type,
  entity_id,
  panel_type,
  details
)
SELECT
  'PAYMENT_STATUS_CORRECTION',
  'payments',
  'PAY002',
  'system',
  jsonb_build_object(
    'old_status', 'paid',
    'new_status', 'in_escrow',
    'reason', 'Correção do fluxo de escrow - webhook anterior pulava custódia',
    'migration_date', now(),
    'quote_id', quote_id,
    'note', 'Pagamento corrigido para permitir agendamento de entrega'
  )
FROM payments
WHERE id = 'PAY002';