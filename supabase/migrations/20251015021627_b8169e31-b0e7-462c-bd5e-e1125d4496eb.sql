-- Adicionar campos warranty_months e shipping_cost à tabela quote_responses
ALTER TABLE public.quote_responses 
ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT 12 
  CHECK (warranty_months >= 0 AND warranty_months <= 120),
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0 
  CHECK (shipping_cost >= 0);

COMMENT ON COLUMN public.quote_responses.warranty_months IS 
  'Garantia oferecida pelo fornecedor em meses (0-120)';
COMMENT ON COLUMN public.quote_responses.shipping_cost IS 
  'Custo de frete cobrado pelo fornecedor em reais';

-- Atualizar registros existentes para garantir valores padrão
UPDATE public.quote_responses 
SET warranty_months = 12
WHERE warranty_months IS NULL;

UPDATE public.quote_responses 
SET shipping_cost = 0
WHERE shipping_cost IS NULL;