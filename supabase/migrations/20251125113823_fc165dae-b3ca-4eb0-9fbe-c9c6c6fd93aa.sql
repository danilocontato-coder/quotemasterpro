-- Limpeza de pagamentos de teste (#PG001, #PG002, #PG003, PAY003)
-- Mantém apenas pagamentos reais: PAY004, PAY005, PAY006

-- 1. Remover delivery_confirmations de entregas associadas aos pagamentos de teste
DELETE FROM delivery_confirmations
WHERE delivery_id IN (
  SELECT id FROM deliveries 
  WHERE payment_id IN ('#PG001', '#PG002', '#PG003', 'PAY003')
);

-- 2. Remover deliveries associadas aos pagamentos de teste
DELETE FROM deliveries
WHERE payment_id IN ('#PG001', '#PG002', '#PG003', 'PAY003');

-- 3. Remover audit_logs relacionados aos pagamentos de teste
DELETE FROM audit_logs
WHERE entity_type = 'payments'
  AND entity_id IN ('#PG001', '#PG002', '#PG003', 'PAY003');

-- 4. Remover os pagamentos de teste
DELETE FROM payments
WHERE id IN ('#PG001', '#PG002', '#PG003', 'PAY003');

-- 5. Registrar a limpeza no audit_log
INSERT INTO audit_logs (
  user_id,
  action,
  entity_type,
  entity_id,
  panel_type,
  details
) VALUES (
  NULL,
  'SYSTEM_DATA_CLEANUP',
  'payments',
  'multiple',
  'system',
  jsonb_build_object(
    'action', 'Remoção de pagamentos de teste',
    'removed_payments', ARRAY['#PG001', '#PG002', '#PG003', 'PAY003'],
    'reason', 'Dados de ambiente sandbox removidos',
    'kept_payments', ARRAY['PAY004', 'PAY005', 'PAY006'],
    'timestamp', NOW()
  )
);

COMMENT ON TABLE payments IS 
  'Tabela de pagamentos. Limpeza realizada em 2025-01-25: removidos pagamentos de teste #PG001-#PG003 e PAY003. Pagamentos válidos começam em PAY004.';