-- Atualizar template global de WhatsApp para usar o link curto correto
UPDATE public.whatsapp_templates 
SET message_content = '🏢 *{{client_name}}* solicita uma cotação

📋 *Cotação:* {{quote_title}}
🆔 *ID:* {{quote_id}}
📅 *Prazo:* {{deadline_formatted}}
💰 *Valor Total:* R$ {{total_formatted}}

📦 *ITENS SOLICITADOS:*
{{items_list}}

📊 *RESUMO:*
• Total de itens: {{items_count}}
• Valor estimado: R$ {{total_formatted}}

🔗 *Para enviar sua proposta, acesse:*
{{proposal_link}}

📞 *Contato do cliente:*
• Email: {{client_email}}
• Telefone: {{client_phone}}

⏰ Prazo para envio da proposta: {{deadline_formatted}}

_Esta é uma solicitação automática do sistema QuoteMaster Pro_',
variables = '{
  "client_email": "Email do cliente",
  "client_name": "Nome do cliente", 
  "client_phone": "Telefone do cliente",
  "deadline_formatted": "Data limite formatada",
  "items_count": "Número total de itens",
  "items_list": "Lista de itens com quantidades", 
  "proposal_link": "Link curto para envio de proposta",
  "quote_id": "ID da cotação",
  "quote_title": "Título da cotação",
  "total_formatted": "Valor total formatado"
}'::jsonb
WHERE is_global = true AND template_type = 'quote_request' AND active = true;