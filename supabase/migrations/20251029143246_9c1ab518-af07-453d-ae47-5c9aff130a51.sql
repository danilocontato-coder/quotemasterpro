-- Corrigir assinaturas com ciclo inicial encurtado
-- Garante que current_period_end seja 1 mês após current_period_start

UPDATE subscriptions
SET 
  current_period_end = (current_period_start::date + interval '1 month')::timestamptz,
  updated_at = now()
WHERE 
  status IN ('active', 'past_due')
  AND current_period_end < current_period_start + interval '10 days';

-- Registrar auditoria para assinaturas corrigidas
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
SELECT 
  NULL,
  'SUBSCRIPTION_CYCLE_CORRECTED',
  'subscriptions',
  id::text,
  jsonb_build_object(
    'old_period_end', current_period_end,
    'new_period_end', (current_period_start::date + interval '1 month')::timestamptz,
    'correction_reason', 'Fixed shortened initial billing cycle'
  )
FROM subscriptions
WHERE 
  status IN ('active', 'past_due')
  AND current_period_end < current_period_start + interval '10 days';