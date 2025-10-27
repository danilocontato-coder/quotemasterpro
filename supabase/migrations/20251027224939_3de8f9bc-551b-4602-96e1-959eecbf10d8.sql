-- Ativar enforcement de termos para TODOS os usuários
UPDATE system_settings
SET setting_value = jsonb_set(
  setting_value,
  '{enforce_terms}',
  'true'::jsonb
)
WHERE setting_key = 'terms_feature_flags';

-- Adicionar comentário para documentação
COMMENT ON TABLE system_settings IS 'Configurações globais do sistema. Feature flag de termos ativada em 2025-10-27.';