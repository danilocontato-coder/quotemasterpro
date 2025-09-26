-- Ativar funcionalidade de geração de cotações com IA (formato JSONB correto)
UPDATE public.system_settings 
SET setting_value = 'true'::jsonb
WHERE setting_key = 'ai_quote_generation_enabled';

-- Log da ativação
INSERT INTO public.audit_logs (
  action, 
  entity_type, 
  entity_id, 
  panel_type, 
  details
) VALUES (
  'ENABLE_AI_QUOTE_FEATURE',
  'system_settings',
  'ai_quote_generation_enabled',
  'system',
  '{"message": "Funcionalidade de IA para cotações ativada"}'::jsonb
);