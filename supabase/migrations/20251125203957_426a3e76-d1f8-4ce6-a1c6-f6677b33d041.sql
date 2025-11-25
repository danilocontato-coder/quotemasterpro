
-- =====================================================
-- Correção: Atualizar status de pagamento e cotação
-- PAY006 e RFQ15 já com entrega confirmada
-- =====================================================

-- 1. Atualizar status do pagamento PAY006 para completed
UPDATE payments 
SET status = 'completed', 
    updated_at = NOW()
WHERE id = 'PAY006' 
  AND quote_id = 'fe725d9e-5f42-4a3f-9428-67e1acb60973'
  AND status = 'in_escrow';

-- 2. Atualizar status da cotação RFQ15 para finalized
UPDATE quotes 
SET status = 'finalized', 
    updated_at = NOW()
WHERE id = 'fe725d9e-5f42-4a3f-9428-67e1acb60973'
  AND status = 'approved';

-- 3. Inserir logs de auditoria para rastreabilidade
INSERT INTO audit_logs (action, entity_type, entity_id, details, created_at)
VALUES 
  ('STATUS_UPDATE', 'payments', 'PAY006', 
   '{"old_status": "in_escrow", "new_status": "completed", "reason": "Correção manual: entrega já confirmada mas release-escrow não executou"}'::jsonb, NOW()),
  ('STATUS_UPDATE', 'quotes', 'fe725d9e-5f42-4a3f-9428-67e1acb60973',
   '{"old_status": "approved", "new_status": "finalized", "reason": "Correção manual: entrega confirmada e pagamento concluído"}'::jsonb, NOW());

-- 4. Verificar resultados da correção
SELECT 
  'Status corrigidos' as resultado,
  (SELECT status FROM payments WHERE id = 'PAY006') as payment_status,
  (SELECT status FROM quotes WHERE id = 'fe725d9e-5f42-4a3f-9428-67e1acb60973') as quote_status;
