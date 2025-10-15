-- ============================================
-- PARTE 1: Criar tabela email_templates
-- ============================================
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  template_type text NOT NULL DEFAULT 'quote_request',
  name text NOT NULL,
  subject text NOT NULL,
  html_content text NOT NULL,
  plain_text_content text,
  variables jsonb NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  is_global boolean NOT NULL DEFAULT false,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "email_templates_admin" 
ON public.email_templates 
FOR ALL 
USING (get_user_role() = 'admin');

CREATE POLICY "email_templates_client_select" 
ON public.email_templates 
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

-- Trigger updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Unique index for default templates
CREATE UNIQUE INDEX idx_email_templates_default_global 
ON email_templates (template_type, is_global) 
WHERE is_default = true AND is_global = true;

CREATE UNIQUE INDEX idx_email_templates_default_client 
ON email_templates (template_type, client_id) 
WHERE is_default = true AND client_id IS NOT NULL;

-- ============================================
-- PARTE 2: Inserir templates padrão de e-mail
-- ============================================

-- Template para APROVAÇÃO de proposta
INSERT INTO public.email_templates (
  name,
  subject,
  html_content,
  plain_text_content,
  template_type,
  is_global,
  is_default,
  variables
) VALUES (
  'Modelo Padrão - Aprovação de Proposta',
  '🎉 Sua proposta foi APROVADA! - {{quote_title}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .highlight { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; }
    .info-box { background: white; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .footer { text-align: center; color: #777; font-size: 12px; margin-top: 30px; }
    .btn { display: inline-block; background: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Parabéns!</h1>
      <p style="font-size: 18px; margin: 10px 0 0 0;">Sua proposta foi aprovada!</p>
    </div>
    <div class="content">
      <div class="highlight">
        <h2 style="margin-top: 0;">✅ Proposta Aprovada com Sucesso</h2>
        <p>Estamos felizes em informar que sua proposta foi <strong>aprovada</strong> pelo cliente!</p>
      </div>
      <div class="info-box">
        <h3>📋 Detalhes da Cotação</h3>
        <p><strong>Cotação:</strong> {{quote_title}}</p>
        <p><strong>Cliente:</strong> {{client_name}}</p>
        <p><strong>Valor Aprovado:</strong> <span style="color: #4caf50; font-size: 20px; font-weight: bold;">R$ {{approved_amount}}</span></p>
        <p><strong>Prazo de Entrega:</strong> {{delivery_time}} dias</p>
      </div>
      {{#if comments}}
      <div class="info-box">
        <h3>💬 Observações do Cliente</h3>
        <p style="font-style: italic;">{{comments}}</p>
      </div>
      {{/if}}
      <div style="margin: 30px 0; text-align: center;">
        <p><strong>Em breve entraremos em contato para finalizar os detalhes da compra.</strong></p>
        <a href="{{dashboard_url}}" class="btn">Acessar Painel</a>
      </div>
      <div class="info-box">
        <h3>📞 Próximos Passos</h3>
        <ul>
          <li>Aguarde o contato do cliente para confirmação final</li>
          <li>Prepare os itens para entrega</li>
          <li>Envie a nota fiscal para: {{client_email}}</li>
        </ul>
      </div>
      <p style="margin-top: 30px;">Obrigado pela sua proposta! Esperamos continuar fazendo negócios com você. 🤝</p>
      <div class="footer">
        <p>Esta é uma notificação automática do sistema Cotiz</p>
        <p>© 2025 Cotiz - Todos os direitos reservados</p>
      </div>
    </div>
  </div>
</body>
</html>',
  '🎉 PARABÉNS! SUA PROPOSTA FOI APROVADA!

Estamos felizes em informar que sua proposta foi APROVADA pelo cliente!

📋 DETALHES DA COTAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Cotação: {{quote_title}}
• Cliente: {{client_name}}
• Valor Aprovado: R$ {{approved_amount}}
• Prazo de Entrega: {{delivery_time}} dias

{{#if comments}}
💬 OBSERVAÇÕES DO CLIENTE:
{{comments}}
{{/if}}

📞 PRÓXIMOS PASSOS:
• Aguarde o contato do cliente para confirmação final
• Prepare os itens para entrega
• Envie a nota fiscal para: {{client_email}}

Em breve entraremos em contato para finalizar os detalhes da compra.

Obrigado pela sua proposta! 🤝

---
Esta é uma notificação automática do sistema Cotiz
© 2025 Cotiz - Todos os direitos reservados',
  'proposal_approved',
  true,
  true,
  '{"quote_title": "Título da cotação", "client_name": "Nome do cliente", "approved_amount": "Valor aprovado formatado", "delivery_time": "Prazo de entrega", "comments": "Comentários do cliente (opcional)", "dashboard_url": "Link para o painel do fornecedor", "client_email": "Email do cliente"}'::jsonb
);

-- Template para REJEIÇÃO de proposta
INSERT INTO public.email_templates (
  name,
  subject,
  html_content,
  plain_text_content,
  template_type,
  is_global,
  is_default,
  variables
) VALUES (
  'Modelo Padrão - Proposta Não Selecionada',
  '📋 Atualização sobre sua proposta - {{quote_title}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #455a64; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #777; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Atualização sobre sua Proposta</h1>
    </div>
    <div class="content">
      <div class="info-box">
        <p>Informamos que a cotação <strong>{{quote_title}}</strong> foi finalizada e outra proposta foi escolhida pelo cliente.</p>
      </div>
      <p>Agradecemos sua participação e esperamos contar com você em futuras oportunidades!</p>
      <div class="footer">
        <p>Esta é uma notificação automática do sistema Cotiz</p>
        <p>© 2025 Cotiz - Todos os direitos reservados</p>
      </div>
    </div>
  </div>
</body>
</html>',
  '📋 ATUALIZAÇÃO SOBRE SUA PROPOSTA

Informamos que a cotação "{{quote_title}}" foi finalizada e outra proposta foi escolhida pelo cliente.

Agradecemos sua participação e esperamos contar com você em futuras oportunidades!

---
Esta é uma notificação automática do sistema Cotiz
© 2025 Cotiz',
  'proposal_rejected',
  true,
  true,
  '{"quote_title": "Título da cotação"}'::jsonb
);

-- ============================================
-- PARTE 3: Template WhatsApp para aprovação
-- ============================================
INSERT INTO public.whatsapp_templates (
  name,
  subject,
  message_content,
  template_type,
  is_global,
  is_default,
  variables
) VALUES (
  'Modelo Padrão - Aprovação de Proposta',
  'Proposta Aprovada',
  '🎉 *Parabéns! Sua proposta foi APROVADA!*

*Cotação:* {{quote_title}}
*Cliente:* {{client_name}}
*Valor aprovado:* R$ {{approved_amount}}
*Prazo de entrega:* {{delivery_time}} dias

{{#if comments}}
*Observações:* {{comments}}
{{/if}}

Em breve entraremos em contato para finalizar os detalhes da compra.

Obrigado pela sua proposta! 🤝',
  'proposal_approved',
  true,
  true,
  '{"quote_title": "Título da cotação", "client_name": "Nome do cliente", "approved_amount": "Valor aprovado", "delivery_time": "Prazo de entrega", "comments": "Comentários (opcional)"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- ============================================
-- PARTE 4: Função RPC para verificar aprovação
-- ============================================
CREATE OR REPLACE FUNCTION public.check_approval_required(
  p_quote_id text,
  p_amount numeric,
  p_client_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  approval_level_record RECORD;
  result jsonb;
BEGIN
  -- Buscar o nível de aprovação apropriado para o valor
  SELECT * INTO approval_level_record
  FROM public.approval_levels
  WHERE client_id = p_client_id
    AND active = true
    AND p_amount >= amount_threshold
    AND (max_amount_threshold IS NULL OR p_amount <= max_amount_threshold)
  ORDER BY order_level ASC
  LIMIT 1;
  
  -- Se encontrou um nível de aprovação, retornar dados
  IF FOUND THEN
    result := jsonb_build_object(
      'required', true,
      'level', jsonb_build_object(
        'id', approval_level_record.id,
        'name', approval_level_record.name,
        'approvers', approval_level_record.approvers,
        'amount_threshold', approval_level_record.amount_threshold,
        'max_amount_threshold', approval_level_record.max_amount_threshold
      )
    );
  ELSE
    result := jsonb_build_object(
      'required', false,
      'level', null
    );
  END IF;
  
  RETURN result;
END;
$$;