-- Corrigir manualmente a assinatura do cliente Motiz (falecom@motiz.com.br)
-- Atualizando período de 04/10/2025 -> 04/11/2025 para 04/11/2025 -> 04/12/2025
UPDATE subscriptions
SET 
  current_period_start = '2025-11-04 00:00:00+00',
  current_period_end = '2025-12-04 00:00:00+00',
  updated_at = NOW()
WHERE id = '2a67b276-ce93-48e2-90e9-4e0d550c466e';