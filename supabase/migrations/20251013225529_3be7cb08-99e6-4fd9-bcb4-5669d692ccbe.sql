-- Criar template de convite de registro para fornecedores não cadastrados
INSERT INTO whatsapp_templates (
  name,
  template_type,
  subject,
  message_content,
  is_global,
  is_default,
  active
)
SELECT 
  'Convite de Registro - Fornecedor',
  'supplier_registration_invite',
  'Complete seu Cadastro para Responder Cotações',
  E'🎉 Olá, {{supplier_name}}!\n\n' ||
  'Você tem *1 nova cotação* aguardando sua resposta!\n\n' ||
  '📋 *Cotação:* {{quote_title}}\n' ||
  '🏢 *Cliente:* {{client_name}}\n' ||
  '⏰ *Prazo:* {{deadline}}\n\n' ||
  '⚠️ *Para visualizar e responder, você precisa completar seu cadastro.*\n\n' ||
  '✅ É rápido! Clique no link abaixo:\n' ||
  '{{registration_link}}\n\n' ||
  'Após o cadastro, você receberá suas credenciais por WhatsApp e poderá responder a cotação imediatamente! 🚀',
  true,
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM whatsapp_templates 
  WHERE template_type = 'supplier_registration_invite'
);