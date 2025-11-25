-- CORREÇÃO: Ajustar pagamentos com inconsistência antes de adicionar constraint
-- #PG003 e PAY003 têm transfer_status incorreto ou missing transfer_id

-- 1. Corrigir #PG003: tem transfer_status=completed mas sem asaas_transfer_id
UPDATE payments
SET 
  transfer_status = 'pending',
  updated_at = NOW()
WHERE id = '#PG003'
  AND status = 'completed'
  AND transfer_status = 'completed'
  AND asaas_transfer_id IS NULL;

-- 2. Log de correção
INSERT INTO audit_logs (
  user_id,
  action,
  entity_type,
  entity_id,
  panel_type,
  details
) 
SELECT 
  NULL,
  'SYSTEM_PAYMENT_CORRECTION',
  'payments',
  id,
  'system',
  jsonb_build_object(
    'issue', 'transfer_status=completed sem asaas_transfer_id',
    'action', 'Alterado transfer_status para pending',
    'requires_manual_transfer', true,
    'amount', supplier_net_amount
  )
FROM payments
WHERE id IN ('PAY003', '#PG003')
  AND status = 'completed'
  AND asaas_transfer_id IS NULL;

-- 3. Agora adicionar constraint
ALTER TABLE payments 
ADD CONSTRAINT check_completed_has_transfer_id 
CHECK (
  (status != 'completed' OR transfer_status != 'completed') 
  OR 
  (asaas_transfer_id IS NOT NULL)
);

COMMENT ON CONSTRAINT check_completed_has_transfer_id ON payments IS 
  'Garante que pagamentos com status=completed e transfer_status=completed possuem asaas_transfer_id';
