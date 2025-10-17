-- Correção completa: constraints + normalização de pagamentos offline

-- 1. Corrigir constraint de quotes.status incluindo TODOS os valores existentes + 'paid'
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;

ALTER TABLE quotes 
ADD CONSTRAINT quotes_status_check 
CHECK (
  status IN (
    'draft',
    'sent',
    'receiving',
    'received',
    'approved',
    'rejected',
    'paid',
    'cancelled',
    'expired',
    'ai_analyzing',
    'visit_confirmed',
    'visit_partial_scheduled'
  )
);

-- 2. Remover constraints restritivas de payments
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_release_reason_check;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_transfer_method_check;

-- 3. Adicionar constraint flexível para release_reason
ALTER TABLE payments 
ADD CONSTRAINT payments_release_reason_check 
CHECK (
  release_reason IS NULL OR 
  release_reason IN (
    'automatic_release',
    'manual_release', 
    'delivery_confirmed',
    'dispute_resolved',
    'client_confirmed',
    'supplier_confirmed_offline',
    'admin_override'
  )
);

-- 4. Adicionar constraint flexível para transfer_method
ALTER TABLE payments 
ADD CONSTRAINT payments_transfer_method_check 
CHECK (
  transfer_method IS NULL OR 
  transfer_method IN (
    'bank_transfer',
    'pix',
    'wallet',
    'direct',
    'escrow_release'
  )
);

-- 5. Atualizar pagamentos offline em in_escrow para completed
UPDATE payments
SET 
  status = 'completed',
  release_reason = 'supplier_confirmed_offline',
  transfer_status = 'completed',
  transfer_method = 'direct',
  reviewed_at = COALESCE(reviewed_at, now()),
  updated_at = now()
WHERE 
  status = 'in_escrow'
  AND (
    payment_method IN ('pix', 'boleto', 'bank_transfer') 
    OR offline_attachments IS NOT NULL
  )
  AND stripe_session_id IS NULL
  AND asaas_payment_id IS NULL;

-- 6. Criar audit logs para os pagamentos normalizados
INSERT INTO audit_logs (
  user_id,
  action,
  entity_type,
  entity_id,
  panel_type,
  details
)
SELECT 
  COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid),
  'PAYMENT_STATUS_NORMALIZED',
  'payments',
  id,
  'system',
  jsonb_build_object(
    'previous_status', 'in_escrow',
    'new_status', 'completed',
    'reason', 'offline_payment_normalization',
    'payment_method', payment_method,
    'quote_id', quote_id,
    'normalized_at', now()
  )
FROM payments
WHERE 
  status = 'completed'
  AND release_reason = 'supplier_confirmed_offline'
  AND transfer_status = 'completed'
  AND (
    payment_method IN ('pix', 'boleto', 'bank_transfer') 
    OR offline_attachments IS NOT NULL
  )
  AND stripe_session_id IS NULL
  AND asaas_payment_id IS NULL
  AND updated_at >= now() - interval '1 minute';