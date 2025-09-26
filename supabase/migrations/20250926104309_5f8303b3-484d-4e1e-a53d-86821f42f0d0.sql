-- Inserir configuração da OpenAI API key no sistema
INSERT INTO public.system_settings (setting_key, setting_value, description) 
VALUES (
  'openai_api_key', 
  '{"value": ""}', 
  'Chave da API OpenAI para funcionalidades de IA'
) 
ON CONFLICT (setting_key) DO NOTHING;