-- ============================================================================
-- MÓDULO DE E-MAIL MARKETING COMPLETO
-- ============================================================================

-- 1. Tabela de Campanhas de E-mail Marketing
CREATE TABLE IF NOT EXISTS public.email_marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Informações Básicas
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL DEFAULT 'newsletter', -- newsletter, promotional, informational, transactional
  
  -- Conteúdo
  subject_line TEXT NOT NULL,
  preview_text TEXT,
  from_name TEXT NOT NULL,
  reply_to_email TEXT,
  
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  
  -- IA Generated Content
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Segmentação e Audiência
  target_segment JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipient_count INTEGER DEFAULT 0,
  
  -- Agendamento
  scheduled_send_at TIMESTAMP WITH TIME ZONE,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  
  -- A/B Testing
  ab_testing_enabled BOOLEAN DEFAULT false,
  ab_variant_id UUID REFERENCES public.email_marketing_campaigns(id),
  ab_test_percentage NUMERIC(5,2) DEFAULT 50.00,
  ab_winning_variant TEXT,
  
  -- Status e Controle
  status TEXT NOT NULL DEFAULT 'draft',
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  
  -- Métricas Calculadas
  open_rate NUMERIC(5,2) DEFAULT 0.00,
  click_rate NUMERIC(5,2) DEFAULT 0.00,
  bounce_rate NUMERIC(5,2) DEFAULT 0.00,
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_email_campaigns_client ON public.email_marketing_campaigns(client_id);
CREATE INDEX idx_email_campaigns_status ON public.email_marketing_campaigns(status);
CREATE INDEX idx_email_campaigns_scheduled ON public.email_marketing_campaigns(scheduled_send_at);

-- 2. Tabela de Destinatários de Campanha
CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.email_marketing_campaigns(id) ON DELETE CASCADE,
  
  -- Destinatário
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_type TEXT NOT NULL,
  recipient_id UUID,
  
  -- Personalização
  personalization_data JSONB DEFAULT '{}'::jsonb,
  
  -- Status de Envio
  send_status TEXT DEFAULT 'pending',
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  first_click_at TIMESTAMP WITH TIME ZONE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  
  -- Erros
  error_message TEXT,
  bounce_type TEXT,
  
  -- Metadata
  message_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_campaign_recipients_campaign ON public.email_campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_email ON public.email_campaign_recipients(recipient_email);
CREATE INDEX idx_campaign_recipients_status ON public.email_campaign_recipients(send_status);
CREATE UNIQUE INDEX idx_campaign_recipients_unique ON public.email_campaign_recipients(campaign_id, recipient_email);

-- 3. Tabela de Cliques em E-mails
CREATE TABLE IF NOT EXISTS public.email_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.email_marketing_campaigns(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.email_campaign_recipients(id) ON DELETE CASCADE,
  
  -- Link clicado
  link_url TEXT NOT NULL,
  link_label TEXT,
  
  -- Metadata
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_agent TEXT,
  ip_address TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_email_clicks_campaign ON public.email_clicks(campaign_id);
CREATE INDEX idx_email_clicks_recipient ON public.email_clicks(recipient_id);

-- 4. Tabela de Descadastros
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  email TEXT NOT NULL UNIQUE,
  reason TEXT,
  unsubscribed_from_campaign_id UUID REFERENCES public.email_marketing_campaigns(id),
  
  unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_email_unsubscribes_email ON public.email_unsubscribes(email);

-- 5. Biblioteca de Templates de E-mail
CREATE TABLE IF NOT EXISTS public.email_templates_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  
  thumbnail_url TEXT,
  
  html_template TEXT NOT NULL,
  css_styles TEXT,
  
  variables JSONB DEFAULT '[]'::jsonb,
  
  is_ai_optimized BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.email_marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates_library ENABLE ROW LEVEL SECURITY;

-- Policies para email_marketing_campaigns
CREATE POLICY "campaigns_client_access" ON public.email_marketing_campaigns
  FOR ALL USING (
    get_user_role() = 'admin' OR 
    client_id = get_current_user_client_id()
  );

-- Policies para email_campaign_recipients
CREATE POLICY "recipients_campaign_access" ON public.email_campaign_recipients
  FOR SELECT USING (
    get_user_role() = 'admin' OR
    campaign_id IN (
      SELECT id FROM public.email_marketing_campaigns 
      WHERE client_id = get_current_user_client_id()
    )
  );

CREATE POLICY "recipients_insert" ON public.email_campaign_recipients
  FOR INSERT WITH CHECK (
    get_user_role() = 'admin' OR
    campaign_id IN (
      SELECT id FROM public.email_marketing_campaigns 
      WHERE client_id = get_current_user_client_id()
    )
  );

-- Policies para email_clicks
CREATE POLICY "clicks_campaign_access" ON public.email_clicks
  FOR SELECT USING (
    get_user_role() = 'admin' OR
    campaign_id IN (
      SELECT id FROM public.email_marketing_campaigns 
      WHERE client_id = get_current_user_client_id()
    )
  );

CREATE POLICY "clicks_insert" ON public.email_clicks
  FOR INSERT WITH CHECK (true);

-- Policies para email_unsubscribes
CREATE POLICY "unsubscribes_public_read" ON public.email_unsubscribes
  FOR SELECT USING (true);

CREATE POLICY "unsubscribes_public_insert" ON public.email_unsubscribes
  FOR INSERT WITH CHECK (true);

-- Policies para email_templates_library
CREATE POLICY "templates_library_read" ON public.email_templates_library
  FOR SELECT USING (is_active = true);

CREATE POLICY "templates_library_admin" ON public.email_templates_library
  FOR ALL USING (get_user_role() = 'admin');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_email_campaign_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_email_marketing_campaigns_timestamp
  BEFORE UPDATE ON public.email_marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_email_campaign_timestamp();

CREATE TRIGGER update_email_campaign_recipients_timestamp
  BEFORE UPDATE ON public.email_campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_email_campaign_timestamp();

-- Trigger para atualizar métricas da campanha
CREATE OR REPLACE FUNCTION update_campaign_metrics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.email_marketing_campaigns
  SET 
    opened_count = (
      SELECT COUNT(DISTINCT id) 
      FROM public.email_campaign_recipients 
      WHERE campaign_id = NEW.campaign_id AND opened_at IS NOT NULL
    ),
    clicked_count = (
      SELECT COUNT(DISTINCT id) 
      FROM public.email_campaign_recipients 
      WHERE campaign_id = NEW.campaign_id AND first_click_at IS NOT NULL
    ),
    delivered_count = (
      SELECT COUNT(*) 
      FROM public.email_campaign_recipients 
      WHERE campaign_id = NEW.campaign_id AND send_status = 'delivered'
    ),
    bounced_count = (
      SELECT COUNT(*) 
      FROM public.email_campaign_recipients 
      WHERE campaign_id = NEW.campaign_id AND send_status = 'bounced'
    ),
    open_rate = CASE 
      WHEN sent_count > 0 THEN 
        ROUND((opened_count::NUMERIC / sent_count::NUMERIC) * 100, 2)
      ELSE 0 
    END,
    click_rate = CASE 
      WHEN sent_count > 0 THEN 
        ROUND((clicked_count::NUMERIC / sent_count::NUMERIC) * 100, 2)
      ELSE 0 
    END,
    bounce_rate = CASE 
      WHEN sent_count > 0 THEN 
        ROUND((bounced_count::NUMERIC / sent_count::NUMERIC) * 100, 2)
      ELSE 0 
    END,
    updated_at = now()
  WHERE id = NEW.campaign_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_campaign_metrics_on_recipient_change
  AFTER INSERT OR UPDATE ON public.email_campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_metrics();

-- ============================================================================
-- FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para processar campanhas agendadas
CREATE OR REPLACE FUNCTION public.trigger_scheduled_email_campaigns()
RETURNS void AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-email-campaign',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('action', 'process_scheduled')
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao chamar send-email-campaign: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- CRON JOB (Executar a cada 10 minutos)
-- ============================================================================

SELECT cron.schedule(
  'send-scheduled-email-campaigns',
  '*/10 * * * *',
  $$SELECT public.trigger_scheduled_email_campaigns();$$
);

-- ============================================================================
-- DADOS INICIAIS - TEMPLATES BÁSICOS
-- ============================================================================

INSERT INTO public.email_templates_library (name, description, category, html_template, variables, is_ai_optimized, is_premium) VALUES
('Newsletter Simples', 'Template minimalista para newsletters regulares', 'newsletter', 
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #003366;">{{title}}</h1>
  <p>Olá {{recipient_name}},</p>
  <div style="line-height: 1.6;">{{content}}</div>
  <div style="margin-top: 30px;">
    <a href="{{cta_url}}" style="background-color: #003366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">{{cta_text}}</a>
  </div>
</div>', 
'["title", "recipient_name", "content", "cta_url", "cta_text"]'::jsonb, true, false),

('Promoção Black Friday', 'Template promocional com desconto destacado', 'promotional',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%); color: white; padding: 40px;">
  <h1 style="text-align: center; font-size: 48px; margin: 0;">BLACK FRIDAY</h1>
  <h2 style="text-align: center; color: #FFD700;">{{discount}}% OFF</h2>
  <p style="text-align: center; font-size: 18px;">{{description}}</p>
  <div style="text-align: center; margin-top: 30px;">
    <a href="{{cta_url}}" style="background-color: #FFD700; color: #1a1a1a; padding: 16px 32px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 18px;">{{cta_text}}</a>
  </div>
</div>',
'["discount", "description", "cta_url", "cta_text"]'::jsonb, true, false),

('Welcome Email', 'Template de boas-vindas para novos clientes', 'welcome',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #003366;">Bem-vindo(a), {{recipient_name}}! 🎉</h1>
  <p>Estamos muito felizes em tê-lo(a) conosco.</p>
  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3>Próximos passos:</h3>
    <ol>
      <li>Complete seu perfil</li>
      <li>Explore nossos recursos</li>
      <li>Entre em contato se precisar de ajuda</li>
    </ol>
  </div>
  <div style="margin-top: 30px;">
    <a href="{{cta_url}}" style="background-color: #003366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">{{cta_text}}</a>
  </div>
</div>',
'["recipient_name", "cta_url", "cta_text"]'::jsonb, true, false);