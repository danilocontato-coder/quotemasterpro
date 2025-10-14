-- ====================================================================
-- FASE 1: Corrigir Cálculo de Custos
-- ====================================================================

-- 1.1 Inserir modelo gpt-4o-mini-2024-07-18 com preços corretos
INSERT INTO public.ai_model_pricing (provider, model, prompt_price_per_1k, completion_price_per_1k, active, effective_date)
VALUES ('openai', 'gpt-4o-mini-2024-07-18', 0.000150, 0.000600, true, '2024-07-18')
ON CONFLICT (provider, model, effective_date) DO UPDATE
SET 
  prompt_price_per_1k = EXCLUDED.prompt_price_per_1k,
  completion_price_per_1k = EXCLUDED.completion_price_per_1k,
  active = EXCLUDED.active;

-- 1.2 Recalcular custos zerados usando tokens armazenados
UPDATE public.ai_token_usage AS atu
SET cost_usd = (
  (atu.prompt_tokens / 1000.0 * amp.prompt_price_per_1k) +
  (atu.completion_tokens / 1000.0 * amp.completion_price_per_1k)
)
FROM public.ai_model_pricing amp
WHERE atu.provider = amp.provider
  AND atu.model = amp.model
  AND amp.active = true
  AND atu.cost_usd = 0
  AND amp.id = (
    SELECT id FROM public.ai_model_pricing
    WHERE provider = atu.provider 
      AND model = atu.model 
      AND active = true
    ORDER BY effective_date DESC
    LIMIT 1
  );

-- ====================================================================
-- FASE 2: Adicionar Conversão USD → BRL
-- ====================================================================

-- 2.1 Criar tabela de taxas de câmbio
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_from TEXT NOT NULL DEFAULT 'USD',
  currency_to TEXT NOT NULL DEFAULT 'BRL',
  rate NUMERIC NOT NULL,
  effective_date DATE NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_currency_date UNIQUE (currency_from, currency_to, effective_date)
);

-- Habilitar RLS
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Política de leitura para usuários autenticados
CREATE POLICY "exchange_rates_select" ON public.exchange_rates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Política de admin para inserir/atualizar
CREATE POLICY "exchange_rates_admin_all" ON public.exchange_rates
  FOR ALL
  USING (get_user_role() = 'admin');

-- Inserir taxa inicial (exemplo: 1 USD = 5.00 BRL)
INSERT INTO public.exchange_rates (currency_from, currency_to, rate, effective_date, source)
VALUES ('USD', 'BRL', 5.00, CURRENT_DATE, 'initial_config')
ON CONFLICT (currency_from, currency_to, effective_date) DO UPDATE
SET rate = EXCLUDED.rate, updated_at = NOW();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_exchange_rates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_exchange_rates_updated_at
  BEFORE UPDATE ON public.exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_exchange_rates_updated_at();

COMMENT ON TABLE public.exchange_rates IS 'Armazena taxas de câmbio USD/BRL para conversão de custos de IA';