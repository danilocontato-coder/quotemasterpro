-- Adicionar client_id às tabelas de configuração da IA
ALTER TABLE public.ai_negotiation_settings 
ADD COLUMN client_id UUID REFERENCES public.clients(id);

ALTER TABLE public.ai_prompts 
ADD COLUMN client_id UUID REFERENCES public.clients(id);

-- Atualizar constraint unique para incluir client_id
ALTER TABLE public.ai_negotiation_settings 
DROP CONSTRAINT ai_negotiation_settings_setting_key_key;

ALTER TABLE public.ai_negotiation_settings 
ADD CONSTRAINT ai_negotiation_settings_unique_per_client 
UNIQUE(setting_key, client_id);

-- Remover políticas antigas
DROP POLICY "ai_negotiation_settings_admin_all" ON public.ai_negotiation_settings;
DROP POLICY "ai_prompts_admin_all" ON public.ai_prompts;

-- Criar novas políticas RLS por cliente
CREATE POLICY "ai_negotiation_settings_admin" ON public.ai_negotiation_settings
  FOR ALL 
  USING (get_user_role() = 'admin'::text);

CREATE POLICY "ai_negotiation_settings_client" ON public.ai_negotiation_settings
  FOR ALL 
  USING (
    client_id IN (
      SELECT profiles.client_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT profiles.client_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "ai_prompts_admin" ON public.ai_prompts
  FOR ALL 
  USING (get_user_role() = 'admin'::text);

CREATE POLICY "ai_prompts_client" ON public.ai_prompts
  FOR ALL 
  USING (
    client_id IN (
      SELECT profiles.client_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    ) OR client_id IS NULL -- Prompts globais/sistema
  )
  WITH CHECK (
    client_id IN (
      SELECT profiles.client_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

-- Inserir configurações padrão para cada cliente existente
INSERT INTO public.ai_negotiation_settings (setting_key, setting_value, category, description, client_id)
SELECT 
  'general_config',
  '{"enabled": true, "autoAnalysis": true, "autoNegotiation": false, "maxDiscountPercent": 15, "minNegotiationAmount": 1000, "aggressiveness": "moderate"}',
  'general',
  'Configurações gerais da IA',
  c.id
FROM public.clients c
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_negotiation_settings ans 
  WHERE ans.client_id = c.id AND ans.setting_key = 'general_config'
);

-- Inserir prompts padrão para cada cliente existente
INSERT INTO public.ai_prompts (prompt_type, prompt_name, prompt_content, variables, is_default, active, client_id)
SELECT 
  'analysis',
  'Análise de Cotações',
  'Você é um especialista em negociações comerciais. Analise as propostas considerando preço, qualidade, prazo e histórico do fornecedor. Forneça uma análise detalhada destacando vantagens e desvantagens de cada proposta.',
  '["propostas", "fornecedores", "historico"]',
  true,
  true,
  c.id
FROM public.clients c
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_prompts ap 
  WHERE ap.client_id = c.id AND ap.prompt_type = 'analysis'
);

INSERT INTO public.ai_prompts (prompt_type, prompt_name, prompt_content, variables, is_default, active, client_id)
SELECT 
  'negotiation',
  'Negociação Comercial',
  'Crie uma mensagem de negociação profissional, respeitosa e persuasiva. Use tom colaborativo e enfatize benefícios mútuos. Solicite desconto de forma estratégica considerando o relacionamento comercial.',
  '["valor_original", "valor_proposto", "fornecedor"]',
  true,
  true,
  c.id
FROM public.clients c
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_prompts ap 
  WHERE ap.client_id = c.id AND ap.prompt_type = 'negotiation'
);