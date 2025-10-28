-- Corrigir current_period_end de subscriptions existentes para respeitar dia de aniversário
-- Recalcula current_period_end baseado em current_period_start + 1 mês (mesmo dia)

UPDATE subscriptions
SET current_period_end = (current_period_start::date + interval '1 month')::timestamptz
WHERE status IN ('active', 'past_due', 'pending_upgrade')
  AND current_period_end IS NOT NULL
  AND current_period_start IS NOT NULL;