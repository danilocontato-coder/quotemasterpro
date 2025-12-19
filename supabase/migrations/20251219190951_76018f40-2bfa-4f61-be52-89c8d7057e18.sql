-- Criar configuração do webhook de autorização de transferências
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'asaas_webhook_config',
  jsonb_build_object(
    'enabled', true,
    'webhook_url', 'https://bpsqyaxdhqejozmlejcb.supabase.co/functions/v1/approve-transfer-webhook',
    'auth_token', '9df6d376-588d-4b93-881c-2877fb7f0fd6',
    'notification_email', NULL,
    'max_auto_approve_amount', 50000.0,
    'validate_pix_key', true
  ),
  'Configurações do webhook de autorização de transferências do Asaas'
)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();