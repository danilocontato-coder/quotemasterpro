-- Inserir templates padrão para notificação de fornecedores

-- Template WhatsApp para fornecedores
INSERT INTO public.whatsapp_templates (
  name,
  template_type,
  message_content,
  active,
  is_global,
  variables
) VALUES 
(
  'Modelo Padrão - Notificação Fornecedor WhatsApp',
  'supplier_notification_whatsapp',
  'Olá {{supplier_name}}! 👋

Você recebeu uma nova solicitação de cotação:

📋 *{{quote_title}}*
🆔 Cotação: {{quote_id}}
🏢 Cliente: {{client_name}}
📅 Prazo: {{deadline_formatted}}
📦 Itens: {{items_count}} itens

{{items_list}}

🔗 *Envie sua proposta aqui:*
{{proposal_link}}

Em caso de dúvidas, entre em contato:
📞 {{client_contact}}

_Equipe QuoteMaster Pro_',
  true,
  true,
  '{"supplier_name": "Nome do fornecedor", "client_name": "Nome do cliente", "quote_title": "Título da cotação", "quote_id": "ID da cotação", "deadline_formatted": "Data limite formatada", "items_count": "Número total de itens", "items_list": "Lista resumida de itens", "proposal_link": "Link para resposta da proposta", "client_contact": "Contato do cliente"}'
),
(
  'Modelo Padrão - Notificação Fornecedor Email',
  'supplier_notification_email',
  'Prezado(a) {{supplier_name}},

Esperamos que esteja bem! Você recebeu uma nova solicitação de cotação através da nossa plataforma.

**DETALHES DA COTAÇÃO**
- Título: {{quote_title}}
- ID da Cotação: {{quote_id}}
- Cliente: {{client_name}} ({{company_name}})
- Prazo para Resposta: {{deadline_formatted}}
- Total de Itens: {{items_count}}

**ITENS SOLICITADOS:**
{{items_list}}

**PRÓXIMOS PASSOS:**
Para enviar sua proposta, clique no link abaixo:
{{proposal_link}}

**INFORMAÇÕES DE CONTATO:**
Em caso de dúvidas, entre em contato diretamente com o cliente:
{{client_contact}}

Agradecemos sua parceria e aguardamos sua proposta!

Atenciosamente,
Equipe QuoteMaster Pro',
  true,
  true,
  '{"supplier_name": "Nome do fornecedor", "client_name": "Nome do cliente", "quote_title": "Título da cotação", "quote_id": "ID da cotação", "deadline_formatted": "Data limite formatada", "items_count": "Número total de itens", "items_list": "Lista detalhada de itens", "proposal_link": "Link para resposta da proposta", "client_contact": "Contato do cliente", "company_name": "Nome da empresa cliente"}'
);