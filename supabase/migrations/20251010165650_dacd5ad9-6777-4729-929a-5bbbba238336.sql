-- Criar tabela de uso de tokens de IA
CREATE TABLE public.ai_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  feature TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  request_id TEXT,
  quote_id TEXT REFERENCES public.quotes(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para otimizar consultas
CREATE INDEX idx_ai_token_usage_client_id ON public.ai_token_usage(client_id);
CREATE INDEX idx_ai_token_usage_created_at ON public.ai_token_usage(created_at);
CREATE INDEX idx_ai_token_usage_provider ON public.ai_token_usage(provider);
CREATE INDEX idx_ai_token_usage_feature ON public.ai_token_usage(feature);

-- RLS para segurança
ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_token_usage_admin_full" ON public.ai_token_usage
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "ai_token_usage_client_view_own" ON public.ai_token_usage
  FOR SELECT USING (client_id = get_current_user_client_id());

-- Criar tabela de preços de modelos
CREATE TABLE public.ai_model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_price_per_1k NUMERIC(10, 6) NOT NULL,
  completion_price_per_1k NUMERIC(10, 6) NOT NULL,
  active BOOLEAN DEFAULT true,
  effective_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, model, effective_date)
);

-- RLS
ALTER TABLE public.ai_model_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_model_pricing_admin_only" ON public.ai_model_pricing
  FOR ALL USING (get_user_role() = 'admin');

-- Popular preços atuais (2025)
INSERT INTO public.ai_model_pricing (provider, model, prompt_price_per_1k, completion_price_per_1k) VALUES
  ('openai', 'gpt-5-2025-08-07', 0.003, 0.015),
  ('openai', 'gpt-5-mini-2025-08-07', 0.00015, 0.0006),
  ('openai', 'gpt-5-nano-2025-08-07', 0.00005, 0.0002),
  ('openai', 'gpt-4.1-2025-04-14', 0.01, 0.03),
  ('openai', 'gpt-4.1-mini-2025-04-14', 0.0005, 0.002),
  ('openai', 'o3-2025-04-16', 0.02, 0.06),
  ('openai', 'o4-mini-2025-04-16', 0.001, 0.004),
  ('openai', 'gpt-4o', 0.005, 0.015),
  ('openai', 'gpt-4o-mini', 0.00015, 0.0006),
  ('perplexity', 'llama-3.1-sonar-large-128k-online', 0.001, 0.001),
  ('perplexity', 'llama-3.1-sonar-small-128k-online', 0.0002, 0.0002),
  ('perplexity', 'llama-3.1-sonar-huge-128k-online', 0.005, 0.005);

-- Criar view agregada para dashboard
CREATE OR REPLACE VIEW public.ai_usage_summary AS
SELECT 
  atu.client_id,
  c.name as client_name,
  DATE_TRUNC('month', atu.created_at) as month,
  atu.provider,
  atu.feature,
  COUNT(*) as request_count,
  SUM(atu.prompt_tokens) as total_prompt_tokens,
  SUM(atu.completion_tokens) as total_completion_tokens,
  SUM(atu.total_tokens) as total_tokens,
  SUM(atu.cost_usd) as total_cost_usd
FROM public.ai_token_usage atu
LEFT JOIN public.clients c ON c.id = atu.client_id
GROUP BY atu.client_id, c.name, DATE_TRUNC('month', atu.created_at), atu.provider, atu.feature;