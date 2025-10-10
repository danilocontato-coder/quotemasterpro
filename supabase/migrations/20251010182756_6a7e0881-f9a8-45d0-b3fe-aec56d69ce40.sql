-- Inserir template padrão de boas-vindas ao fornecedor
INSERT INTO public.whatsapp_templates (
  name,
  template_type,
  message_content,
  active,
  is_global,
  is_default,
  variables
) VALUES (
  'Boas-vindas Fornecedor - Padrão',
  'supplier_welcome',
  E'🎉 Olá, {{supplier_name}}!\n\nTemos uma ótima notícia! Você foi convidado por *{{client_name}}* para fazer parte da nossa plataforma *{{platform_name}}*.\n\n✅ Com isso, você terá acesso a:\n• Recebimento de cotações\n• Envio de propostas\n• Gestão de pedidos\n• E muito mais!\n\n🔗 *Acesse agora:*\n{{access_link}}\n\nQualquer dúvida, estamos à disposição!',
  true,
  true,
  true,
  '{"supplier_name": "Nome do fornecedor", "client_name": "Nome do cliente que convidou", "platform_name": "Nome da plataforma", "access_link": "Link para acesso ao sistema"}'::jsonb
)
ON CONFLICT DO NOTHING;