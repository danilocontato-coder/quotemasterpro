-- Adicionar campo enabled_modules na tabela subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS enabled_modules jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.subscription_plans.enabled_modules IS 'Lista de módulos habilitados para este plano (ex: ai_quote_analysis, ai_negotiation, advanced_reports)';

-- Atualizar planos existentes com módulos padrão baseado no tipo
UPDATE public.subscription_plans
SET enabled_modules = 
  CASE 
    WHEN id LIKE '%basic%' OR id LIKE '%starter%' THEN 
      '["quotes", "suppliers", "payments"]'::jsonb
    WHEN id LIKE '%pro%' OR id LIKE '%professional%' THEN 
      '["quotes", "suppliers", "payments", "advanced_reports", "ai_quote_analysis"]'::jsonb
    WHEN id LIKE '%enterprise%' OR id LIKE '%premium%' THEN 
      '["quotes", "suppliers", "payments", "advanced_reports", "ai_quote_analysis", "ai_negotiation", "priority_support", "custom_branding"]'::jsonb
    ELSE 
      '["quotes", "suppliers", "payments"]'::jsonb
  END
WHERE enabled_modules = '[]'::jsonb OR enabled_modules IS NULL;