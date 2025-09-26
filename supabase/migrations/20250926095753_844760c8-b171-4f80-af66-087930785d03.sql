-- Adicionar configuração para habilitar/desabilitar criação de cotações com IA
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'ai_quote_generation_enabled',
  'false'::jsonb,
  'Habilita ou desabilita a funcionalidade de criação de cotações com IA'
) ON CONFLICT (setting_key) DO NOTHING;