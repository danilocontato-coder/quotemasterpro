-- Adicionar campos de configuração de faturamento à tabela financial_settings
-- se não existirem

ALTER TABLE public.financial_settings 
ADD COLUMN IF NOT EXISTS billing_day INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS asaas_billing_type TEXT DEFAULT 'BOLETO',
ADD COLUMN IF NOT EXISTS auto_billing_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_suspend_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS days_before_suspension INTEGER DEFAULT 7;