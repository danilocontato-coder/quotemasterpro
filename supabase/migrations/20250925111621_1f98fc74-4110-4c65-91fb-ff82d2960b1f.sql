-- Adicionar novas configurações de faturamento à tabela financial_settings
ALTER TABLE public.financial_settings 
ADD COLUMN IF NOT EXISTS billing_day INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS due_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS default_billing_cycle TEXT DEFAULT 'monthly';

-- Validar valores do billing_day (1-28)
ALTER TABLE public.financial_settings 
ADD CONSTRAINT billing_day_range CHECK (billing_day >= 1 AND billing_day <= 28);

-- Validar valores do due_days (positivo)
ALTER TABLE public.financial_settings 
ADD CONSTRAINT due_days_positive CHECK (due_days > 0);

-- Validar valores do default_billing_cycle
ALTER TABLE public.financial_settings 
ADD CONSTRAINT valid_billing_cycle CHECK (default_billing_cycle IN ('monthly', 'quarterly', 'semiannual', 'yearly'));

-- Atualizar configurações existentes com valores padrão
UPDATE public.financial_settings 
SET 
  billing_day = 1,
  due_days = 30,
  default_billing_cycle = 'monthly'
WHERE billing_day IS NULL OR due_days IS NULL OR default_billing_cycle IS NULL;

-- Atualizar edge function de billing para considerar novas configurações
-- Log das atualizações
INSERT INTO public.financial_logs (
  entity_type,
  entity_id, 
  action,
  new_data,
  automated
) VALUES (
  'system',
  'billing_config_update',
  'updated',
  '{"message": "Configurações de faturamento atualizadas com periodicidade e datas específicas"}'::jsonb,
  true
);