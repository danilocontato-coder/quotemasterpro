INSERT INTO public.system_settings (setting_key, setting_value, description) 
VALUES ('ai_quote_generation_enabled', '{"value": true}', 'Habilita a funcionalidade de geração de cotações por IA')
ON CONFLICT (setting_key) DO NOTHING;