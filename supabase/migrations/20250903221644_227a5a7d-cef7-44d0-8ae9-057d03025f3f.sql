-- Primeiro vamos verificar a constraint atual
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%integrations%integration_type%';

-- Remover a constraint atual
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