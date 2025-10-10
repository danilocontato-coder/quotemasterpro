-- Criar template de boas-vindas para fornecedores via WhatsApp
INSERT INTO whatsapp_templates (
  name,
  template_type,
  message_content,
  variables,
  active,
  is_global,
  is_default
) VALUES (
  'Boas-vindas Fornecedor - Padrão',
  'supplier_welcome',
  'Olá {{supplier_name}}! 👋

Bem-vindo(a) ao *{{platform_name}}*!

Você foi cadastrado(a) como fornecedor(a) por *{{client_name}}*.

📧 *Credenciais de Acesso:*
Email: {{supplier_email}}
Senha: [Enviada separadamente]

🔗 *Acesse o sistema:*
{{access_link}}

*O que você pode fazer agora:*
✅ Receber solicitações de cotação
✅ Enviar propostas competitivas  
✅ Gerenciar catálogo de produtos
✅ Acompanhar pedidos e pagamentos

📱 Qualquer dúvida, responda esta mensagem!

_Equipe {{platform_name}}_',
  jsonb_build_object(
    'supplier_name', 'Nome do fornecedor',
    'supplier_email', 'Email do fornecedor',
    'client_name', 'Nome do cliente',
    'platform_name', 'Nome do sistema',
    'access_link', 'Link de acesso'
  ),
  true,
  true,
  true
) ON CONFLICT DO NOTHING;