-- Migrar mensagem de proposta recebida do system_settings para templates

-- Inserir template de proposta recebida
INSERT INTO public.whatsapp_templates (
  name,
  template_type,
  message_content,
  active,
  is_global,
  variables
) VALUES (
  'Modelo Padrão - Proposta Recebida WhatsApp',
  'proposal_received_whatsapp',
  '🎯 *Nova Proposta Recebida!*

📋 *Cotação:* {{quote_title}} ({{quote_id}})
🏢 *Fornecedor:* {{supplier_name}}
💰 *Valor Total:* R$ {{total_value}}

✅ Uma nova proposta foi enviada para sua cotação. Acesse o sistema para avaliar os detalhes.

_QuoteMaster Pro - Gestão Inteligente de Cotações_',
  true,
  true,
  '{"quote_title": "Título da cotação", "quote_id": "ID da cotação", "supplier_name": "Nome do fornecedor", "total_value": "Valor total formatado"}'
);

-- Remover configuração antiga do system_settings
DELETE FROM public.system_settings WHERE setting_key = 'whatsapp_proposal_message';