-- Create table for WhatsApp message templates
CREATE TABLE public.whatsapp_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id),
  template_type text NOT NULL DEFAULT 'quote_request',
  name text NOT NULL,
  subject text,
  message_content text NOT NULL,
  variables jsonb NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  is_global boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "whatsapp_templates_admin" 
ON public.whatsapp_templates 
FOR ALL 
USING (get_user_role() = 'admin');

CREATE POLICY "whatsapp_templates_client_select" 
ON public.whatsapp_templates 
FOR SELECT 
USING (
  get_user_role() = 'admin' OR 
  is_global = true OR 
  client_id IN (
    SELECT profiles.client_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default global template
INSERT INTO public.whatsapp_templates (
  name,
  subject,
  message_content,
  template_type,
  is_global,
  variables
) VALUES (
  'Modelo Padrão - Solicitação de Cotação',
  'Nova Cotação Disponível 📋',
  '🏢 *{{client_name}}* solicita uma cotação

📋 *Cotação:* {{quote_title}}
🆔 *ID:* {{quote_id}}
📅 *Prazo:* {{deadline_formatted}}
💰 *Valor Total:* R$ {{total_formatted}}

📦 *ITENS SOLICITADOS:*
{{items_list}}

📊 *RESUMO:*
• Total de itens: {{items_count}}
• Valor estimado: R$ {{total_formatted}}

🔗 *Para enviar sua proposta:*
{{proposal_link}}

📞 *Contato do cliente:*
• Email: {{client_email}}
• Telefone: {{client_phone}}

⏰ Prazo para envio da proposta: {{deadline_formatted}}

_Esta é uma solicitação automática do sistema QuoteMaster Pro_',
  'quote_request',
  true,
  '{
    "client_name": "Nome do cliente",
    "quote_title": "Título da cotação", 
    "quote_id": "ID da cotação",
    "deadline_formatted": "Data limite formatada",
    "total_formatted": "Valor total formatado",
    "items_list": "Lista de itens com quantidades",
    "items_count": "Número total de itens",
    "proposal_link": "Link para envio de proposta",
    "client_email": "Email do cliente",
    "client_phone": "Telefone do cliente"
  }'::jsonb
);