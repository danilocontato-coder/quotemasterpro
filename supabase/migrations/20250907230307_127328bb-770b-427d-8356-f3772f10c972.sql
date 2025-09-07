-- Criar tabela para configurações da IA
CREATE TABLE public.ai_negotiation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(setting_key)
);

-- Criar tabela para prompts da IA
CREATE TABLE public.ai_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_type TEXT NOT NULL,
  prompt_name TEXT NOT NULL,
  prompt_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.ai_negotiation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para ai_negotiation_settings (apenas admins)
CREATE POLICY "ai_negotiation_settings_admin_all" ON public.ai_negotiation_settings
  FOR ALL USING (get_user_role() = 'admin'::text);

-- Políticas RLS para ai_prompts (apenas admins)
CREATE POLICY "ai_prompts_admin_all" ON public.ai_prompts
  FOR ALL USING (get_user_role() = 'admin'::text);

-- Inserir configurações padrão
INSERT INTO public.ai_negotiation_settings (setting_key, setting_value, category, description) VALUES 
('general_config', '{"enabled": true, "autoAnalysis": true, "autoNegotiation": false, "maxDiscountPercent": 15, "minNegotiationAmount": 1000, "aggressiveness": "moderate"}', 'general', 'Configurações gerais da IA');

-- Inserir prompts padrão
INSERT INTO public.ai_prompts (prompt_type, prompt_name, prompt_content, variables, is_default, active, created_by) VALUES 
('analysis', 'Análise de Cotações', 'Você é um especialista em negociações comerciais. Analise as propostas considerando preço, qualidade, prazo e histórico do fornecedor. Forneça uma análise detalhada destacando vantagens e desvantagens de cada proposta.', '["propostas", "fornecedores", "historico"]', true, true, null),
('negotiation', 'Negociação Comercial', 'Crie uma mensagem de negociação profissional, respeitosa e persuasiva. Use tom colaborativo e enfatize benefícios mútuos. Solicite desconto de forma estratégica considerando o relacionamento comercial.', '["valor_original", "valor_proposto", "fornecedor"]', true, true, null);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ai_negotiation_settings_updated_at
  BEFORE UPDATE ON public.ai_negotiation_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_ai_prompts_updated_at
  BEFORE UPDATE ON public.ai_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();