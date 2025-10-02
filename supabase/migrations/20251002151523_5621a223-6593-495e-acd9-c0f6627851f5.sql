-- ============================================
-- FASE 1: TABELAS DE PROSPECÇÃO INTELIGENTE
-- ============================================

-- Tipo enum para status de leads
CREATE TYPE public.lead_status AS ENUM (
  'new',
  'contacted', 
  'qualified',
  'converted',
  'lost'
);

-- Tipo enum para tipo de lead
CREATE TYPE public.lead_type AS ENUM (
  'client',
  'supplier'
);

-- Tipo enum para canal de comunicação
CREATE TYPE public.outreach_channel AS ENUM (
  'whatsapp',
  'email',
  'phone',
  'linkedin'
);

-- Tipo enum para status de campanha
CREATE TYPE public.campaign_status AS ENUM (
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled'
);

-- ============================================
-- TABELA: ai_leads
-- Armazena leads gerados pela IA
-- ============================================
CREATE TABLE public.ai_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type lead_type NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  segment TEXT NOT NULL,
  region TEXT,
  state TEXT,
  city TEXT,
  
  -- Dados de contato
  contact_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { name, email, phone, cnpj, company_size, etc }
  
  -- Insights da IA
  ai_insights JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { reasoning, potential_revenue, fit_score, recommended_plan, etc }
  
  -- Status e tracking
  status lead_status NOT NULL DEFAULT 'new',
  converted_to_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  converted_to_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_contacted_at TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_ai_leads_type ON public.ai_leads(type);
CREATE INDEX idx_ai_leads_status ON public.ai_leads(status);
CREATE INDEX idx_ai_leads_score ON public.ai_leads(score DESC);
CREATE INDEX idx_ai_leads_segment ON public.ai_leads(segment);
CREATE INDEX idx_ai_leads_region ON public.ai_leads(region);
CREATE INDEX idx_ai_leads_created_at ON public.ai_leads(created_at DESC);

-- RLS: Apenas admins podem acessar
ALTER TABLE public.ai_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_leads_admin_only"
ON public.ai_leads
FOR ALL
TO authenticated
USING (get_user_role() = 'admin');

-- ============================================
-- TABELA: prospecting_campaigns
-- Gerencia campanhas de prospecção
-- ============================================
CREATE TABLE public.prospecting_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Targeting
  target_segment TEXT NOT NULL,
  target_type lead_type NOT NULL,
  target_region TEXT,
  target_filters JSONB DEFAULT '{}'::jsonb,
  
  -- Canal e conteúdo
  channel outreach_channel NOT NULL,
  ai_generated_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { subject, message_template, follow_up_sequence, etc }
  
  -- Configurações
  max_leads INTEGER DEFAULT 100,
  scheduled_at TIMESTAMPTZ,
  
  -- Métricas
  metrics JSONB NOT NULL DEFAULT '{
    "sent": 0,
    "delivered": 0,
    "opened": 0,
    "responded": 0,
    "converted": 0,
    "cost": 0,
    "revenue": 0
  }'::jsonb,
  
  -- Status
  status campaign_status NOT NULL DEFAULT 'draft',
  
  -- Tracking
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_campaigns_status ON public.prospecting_campaigns(status);
CREATE INDEX idx_campaigns_channel ON public.prospecting_campaigns(channel);
CREATE INDEX idx_campaigns_created_at ON public.prospecting_campaigns(created_at DESC);

-- RLS: Apenas admins
ALTER TABLE public.prospecting_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_admin_only"
ON public.prospecting_campaigns
FOR ALL
TO authenticated
USING (get_user_role() = 'admin');

-- ============================================
-- TABELA: outreach_logs
-- Tracking detalhado de cada interação
-- ============================================
CREATE TABLE public.outreach_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relações
  lead_id UUID REFERENCES public.ai_leads(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES public.prospecting_campaigns(id) ON DELETE SET NULL,
  
  -- Detalhes da mensagem
  channel outreach_channel NOT NULL,
  message_sent TEXT NOT NULL,
  subject TEXT,
  
  -- Tracking de engajamento
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  
  -- Resultado
  response_text TEXT,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  
  -- Metadata
  external_message_id TEXT, -- ID do WhatsApp/SendGrid
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_outreach_lead_id ON public.outreach_logs(lead_id);
CREATE INDEX idx_outreach_campaign_id ON public.outreach_logs(campaign_id);
CREATE INDEX idx_outreach_sent_at ON public.outreach_logs(sent_at DESC);
CREATE INDEX idx_outreach_converted ON public.outreach_logs(converted) WHERE converted = true;

-- RLS: Apenas admins
ALTER TABLE public.outreach_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outreach_logs_admin_only"
ON public.outreach_logs
FOR ALL
TO authenticated
USING (get_user_role() = 'admin');

-- ============================================
-- TRIGGERS: Updated_at automático
-- ============================================
CREATE TRIGGER update_ai_leads_updated_at
  BEFORE UPDATE ON public.ai_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.prospecting_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Atualizar métricas de campanha quando um log é criado
CREATE OR REPLACE FUNCTION public.update_campaign_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.campaign_id IS NOT NULL THEN
    UPDATE public.prospecting_campaigns
    SET metrics = jsonb_set(
      metrics,
      '{sent}',
      to_jsonb(COALESCE((metrics->>'sent')::int, 0) + 1)
    ),
    updated_at = now()
    WHERE id = NEW.campaign_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_campaign_metrics_on_send
  AFTER INSERT ON public.outreach_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_metrics();

-- Atualizar métricas quando há resposta
CREATE OR REPLACE FUNCTION public.update_campaign_metrics_on_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.responded_at IS NOT NULL AND OLD.responded_at IS NULL AND NEW.campaign_id IS NOT NULL THEN
    UPDATE public.prospecting_campaigns
    SET metrics = jsonb_set(
      metrics,
      '{responded}',
      to_jsonb(COALESCE((metrics->>'responded')::int, 0) + 1)
    ),
    updated_at = now()
    WHERE id = NEW.campaign_id;
  END IF;
  
  IF NEW.converted = true AND OLD.converted = false AND NEW.campaign_id IS NOT NULL THEN
    UPDATE public.prospecting_campaigns
    SET metrics = jsonb_set(
      metrics,
      '{converted}',
      to_jsonb(COALESCE((metrics->>'converted')::int, 0) + 1)
    ),
    updated_at = now()
    WHERE id = NEW.campaign_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_campaign_metrics_on_response
  AFTER UPDATE ON public.outreach_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_metrics_on_response();

-- Comentários para documentação
COMMENT ON TABLE public.ai_leads IS 'Leads gerados por IA com scoring e insights';
COMMENT ON TABLE public.prospecting_campaigns IS 'Campanhas de prospecção automatizadas';
COMMENT ON TABLE public.outreach_logs IS 'Log detalhado de todas as interações com leads';