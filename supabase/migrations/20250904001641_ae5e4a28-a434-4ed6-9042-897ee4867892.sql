-- Update the integrations table check constraint to include the new whatsapp_evolution type
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_integration_type_check;

ALTER TABLE integrations ADD CONSTRAINT integrations_integration_type_check 
CHECK (integration_type IN (
  'whatsapp_twilio',
  'whatsapp_evolution',
  'email_sendgrid',
  'email_smtp', 
  'payment_stripe',
  'payment_pagseguro',
  'zapier_webhook',
  'n8n_webhook',
  'perplexity',
  'delivery_api',
  'cep_api',
  'currency_api',
  'document_validation',
  'generic_webhook'
));