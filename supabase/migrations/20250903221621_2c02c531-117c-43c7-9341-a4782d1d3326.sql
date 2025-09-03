-- Primeiro, vamos verificar se há constraint no integration_type
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'integrations'::regclass AND contype = 'c';

-- Se não houver dados na tabela, vamos ajustar os tipos permitidos
-- Adicionar os novos tipos de integração suportados
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_integration_type_check;

-- Criar nova constraint com todos os tipos suportados
ALTER TABLE integrations 
ADD CONSTRAINT integrations_integration_type_check 
CHECK (integration_type IN (
  'whatsapp_twilio',
  'email_sendgrid', 
  'email_smtp',
  'payment_stripe',
  'payment_pagseguro',
  'zapier_webhook',
  'n8n_webhook',
  'generic_webhook',
  'perplexity',
  'delivery_api',
  'cep_api',
  'currency_api',
  'document_validation'
));

-- Inserir um webhook N8N de exemplo
INSERT INTO integrations (
  integration_type,
  configuration,
  active
) VALUES (
  'n8n_webhook',
  '{
    "webhook_url": "https://n8n.exemplo.com/webhook/cotacoes",
    "auth_header": "",
    "trigger_events": ["quote_created", "quote_sent", "quote_approved"]
  }'::jsonb,
  true
) ON CONFLICT DO NOTHING;