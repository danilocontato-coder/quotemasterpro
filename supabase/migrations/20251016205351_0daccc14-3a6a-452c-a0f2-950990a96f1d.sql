-- ============================================================================
-- SISTEMA DE COBRANÇA AUTOMÁTICA PARA BOLETOS EM ATRASO
-- ============================================================================

-- 1. Adicionar campos de configuração em financial_settings
ALTER TABLE public.financial_settings 
ADD COLUMN IF NOT EXISTS overdue_reminder_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS overdue_reminder_channels JSONB DEFAULT '["whatsapp", "email"]'::jsonb,
ADD COLUMN IF NOT EXISTS overdue_reminder_schedule JSONB DEFAULT '[1, 3, 7, 15, 30]'::jsonb,
ADD COLUMN IF NOT EXISTS overdue_reminder_stop_after_days INTEGER DEFAULT 45,
ADD COLUMN IF NOT EXISTS late_fee_percentage NUMERIC DEFAULT 2.0;

COMMENT ON COLUMN public.financial_settings.overdue_reminder_enabled IS 'Habilitar/desabilitar lembretes automáticos de cobrança';
COMMENT ON COLUMN public.financial_settings.overdue_reminder_channels IS 'Canais ativos: ["whatsapp", "email"]';
COMMENT ON COLUMN public.financial_settings.overdue_reminder_schedule IS 'Dias após vencimento para enviar lembretes: [1, 3, 7, 15, 30]';
COMMENT ON COLUMN public.financial_settings.overdue_reminder_stop_after_days IS 'Parar de enviar lembretes após X dias';
COMMENT ON COLUMN public.financial_settings.late_fee_percentage IS 'Percentual de multa por atraso';

-- 2. Criar tabela de histórico de lembretes enviados
CREATE TABLE IF NOT EXISTS public.overdue_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  
  -- Controle de envio
  reminder_day INTEGER NOT NULL,
  days_overdue INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Canal WhatsApp
  sent_via_whatsapp BOOLEAN DEFAULT false,
  whatsapp_message_id TEXT,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  whatsapp_error TEXT,
  
  -- Canal E-mail
  sent_via_email BOOLEAN DEFAULT false,
  email_message_id TEXT,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_error TEXT,
  
  -- Dados da fatura no momento do envio
  invoice_amount NUMERIC NOT NULL,
  invoice_due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT unique_invoice_reminder_day UNIQUE(invoice_id, reminder_day)
);

CREATE INDEX IF NOT EXISTS idx_overdue_reminders_invoice ON public.overdue_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_overdue_reminders_client ON public.overdue_reminders(client_id);
CREATE INDEX IF NOT EXISTS idx_overdue_reminders_sent_at ON public.overdue_reminders(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_overdue_reminders_subscription ON public.overdue_reminders(subscription_id);

-- RLS para overdue_reminders
ALTER TABLE public.overdue_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "overdue_reminders_admin_full"
ON public.overdue_reminders FOR ALL
USING (get_user_role() = 'admin');

CREATE POLICY "overdue_reminders_client_view"
ON public.overdue_reminders FOR SELECT
USING (client_id = get_current_user_client_id() OR get_user_role() = 'admin');

-- 3. Trigger para updated_at
CREATE TRIGGER update_overdue_reminders_updated_at
BEFORE UPDATE ON public.overdue_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- 4. Inserir templates padrão de WhatsApp (verificando se já existem antes)
DO $$
BEGIN
  -- Template D+1
  IF NOT EXISTS (
    SELECT 1 FROM public.whatsapp_templates 
    WHERE name = 'Cobrança - Boleto Vencido D+1' AND is_global = true
  ) THEN
    INSERT INTO public.whatsapp_templates (
      name, template_type, subject, message_content, variables, is_global, is_default, active
    ) VALUES (
      'Cobrança - Boleto Vencido D+1',
      'overdue_reminder',
      'Lembrete: Boleto vencido há 1 dia',
      '🔔 *Lembrete de Pagamento*

Olá {{client_name}},

Identificamos que o boleto referente à sua assinatura do plano *{{plan_name}}* venceu há {{days_overdue}} dia(s).

📄 *Fatura:* {{invoice_id}}
💰 *Valor:* R$ {{invoice_amount}}
📅 *Vencimento:* {{due_date}}
⏰ *Dias em atraso:* {{days_overdue}} dia(s)

{{#if boleto_url}}
🔗 *Pagar agora:* {{boleto_url}}
{{/if}}

{{#if late_fee}}
⚠️ *Multa e juros:* R$ {{late_fee}} já foram aplicados.
{{/if}}

Para evitar a suspensão do seu acesso, por favor, realize o pagamento o quanto antes.

Se já pagou, desconsidere este aviso.

_Cotiz - Gestão de Cotações_',
      '["client_name", "plan_name", "invoice_id", "invoice_amount", "due_date", "days_overdue", "boleto_url", "late_fee"]'::jsonb,
      true, true, true
    );
  END IF;

  -- Template D+7
  IF NOT EXISTS (
    SELECT 1 FROM public.whatsapp_templates 
    WHERE name = 'Cobrança - Boleto Vencido D+7' AND is_global = true
  ) THEN
    INSERT INTO public.whatsapp_templates (
      name, template_type, subject, message_content, variables, is_global, is_default, active
    ) VALUES (
      'Cobrança - Boleto Vencido D+7',
      'overdue_reminder',
      '⚠️ URGENTE: Boleto vencido há 7 dias',
      '⚠️ *URGENTE: Pagamento em Atraso*

Olá {{client_name}},

Seu boleto está vencido há *{{days_overdue}} dias* e ainda não identificamos o pagamento.

📄 *Fatura:* {{invoice_id}}
💰 *Valor original:* R$ {{invoice_amount}}
{{#if late_fee}}
💸 *Valor com multa/juros:* R$ {{total_with_fee}}
{{/if}}
📅 *Vencimento:* {{due_date}}

{{#if boleto_url}}
🔗 *Pagar agora:* {{boleto_url}}
{{/if}}

🚨 *Atenção:* Sem o pagamento, seu acesso poderá ser suspenso em breve.

Se já realizou o pagamento, por favor, desconsidere este aviso.

_Cotiz - Gestão de Cotações_',
      '["client_name", "plan_name", "invoice_id", "invoice_amount", "due_date", "days_overdue", "boleto_url", "late_fee", "total_with_fee"]'::jsonb,
      true, false, true
    );
  END IF;

  -- Template D+30
  IF NOT EXISTS (
    SELECT 1 FROM public.whatsapp_templates 
    WHERE name = 'Cobrança - Boleto Vencido D+30' AND is_global = true
  ) THEN
    INSERT INTO public.whatsapp_templates (
      name, template_type, subject, message_content, variables, is_global, is_default, active
    ) VALUES (
      'Cobrança - Boleto Vencido D+30',
      'overdue_reminder',
      '🔴 SUSPENSÃO IMINENTE: Boleto vencido há 30 dias',
      '🔴 *SUSPENSÃO IMINENTE*

Olá {{client_name}},

Seu boleto está vencido há *{{days_overdue}} dias* e estamos prestes a suspender seu acesso.

📄 *Fatura:* {{invoice_id}}
💰 *Valor original:* R$ {{invoice_amount}}
{{#if late_fee}}
💸 *Valor total com multa/juros:* R$ {{total_with_fee}}
{{/if}}
📅 *Vencimento:* {{due_date}}

{{#if boleto_url}}
🔗 *Pagar AGORA:* {{boleto_url}}
{{/if}}

⛔ *Esta é a última tentativa de contato antes da suspensão.*

Se precisar de ajuda, entre em contato conosco imediatamente.

_Cotiz - Gestão de Cotações_',
      '["client_name", "plan_name", "invoice_id", "invoice_amount", "due_date", "days_overdue", "boleto_url", "late_fee", "total_with_fee"]'::jsonb,
      true, false, true
    );
  END IF;
END $$;

-- 5. Inserir template padrão de E-mail
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.email_templates 
    WHERE name = 'Cobrança - Boleto Vencido (E-mail)' AND is_global = true
  ) THEN
    INSERT INTO public.email_templates (
      name, template_type, subject, html_content, plain_text_content, variables, is_global, is_default, active
    ) VALUES (
      'Cobrança - Boleto Vencido (E-mail)',
      'overdue_reminder',
      '🔔 Lembrete: Pagamento em atraso - Fatura {{invoice_id}}',
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: linear-gradient(135deg, #003366 0%, #004080 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0;">🔔 Lembrete de Pagamento</h1>
  </div>
  
  <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <p style="font-size: 16px; color: #1f2937;">Olá <strong>{{client_name}}</strong>,</p>
    
    <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
      Identificamos que o boleto referente à sua assinatura do plano <strong>{{plan_name}}</strong> venceu há <strong>{{days_overdue}} dia(s)</strong>.
    </p>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <p style="margin: 0; color: #92400e;"><strong>⚠️ Atenção:</strong> Para evitar a suspensão do seu acesso, realize o pagamento o quanto antes.</p>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr style="background: #f3f4f6;">
        <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Fatura:</strong></td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">{{invoice_id}}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Valor:</strong></td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">R$ {{invoice_amount}}</td>
      </tr>
      <tr style="background: #f3f4f6;">
        <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Vencimento:</strong></td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">{{due_date}}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Dias em atraso:</strong></td>
        <td style="padding: 12px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">{{days_overdue}} dia(s)</td>
      </tr>
    </table>
    
    {{#if boleto_url}}
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{boleto_url}}" style="display: inline-block; background: linear-gradient(135deg, #003366 0%, #004080 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        💳 Pagar Agora
      </a>
    </div>
    {{/if}}
    
    {{#if late_fee}}
    <p style="font-size: 13px; color: #dc2626; background: #fee2e2; padding: 10px; border-radius: 5px; text-align: center;">
      <strong>Multa e juros:</strong> R$ {{late_fee}} já foram aplicados.
    </p>
    {{/if}}
    
    <p style="font-size: 13px; color: #6b7280; margin-top: 30px;">
      Se já realizou o pagamento, por favor, desconsidere este aviso.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    
    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
      <strong>Cotiz</strong> - Gestão Inteligente de Cotações<br>
      Este é um e-mail automático, por favor não responda.
    </p>
  </div>
</div>',
      'Olá {{client_name}},

Identificamos que o boleto referente à sua assinatura do plano {{plan_name}} venceu há {{days_overdue}} dia(s).

Fatura: {{invoice_id}}
Valor: R$ {{invoice_amount}}
Vencimento: {{due_date}}
Dias em atraso: {{days_overdue}} dia(s)

{{#if boleto_url}}
Pagar agora: {{boleto_url}}
{{/if}}

{{#if late_fee}}
Multa e juros: R$ {{late_fee}} já foram aplicados.
{{/if}}

Para evitar a suspensão do seu acesso, por favor, realize o pagamento o quanto antes.

Se já pagou, desconsidere este aviso.

Cotiz - Gestão de Cotações',
      '["client_name", "plan_name", "invoice_id", "invoice_amount", "due_date", "days_overdue", "boleto_url", "late_fee"]'::jsonb,
      true, true, true
    );
  END IF;
END $$;