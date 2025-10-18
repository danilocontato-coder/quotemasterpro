-- =====================================================
-- TABELA DE CONTATOS DE E-MAIL MARKETING
-- =====================================================

CREATE TABLE public.email_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  source TEXT DEFAULT 'manual', -- manual, imported, api
  unsubscribed_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, email)
);

-- Índices para performance
CREATE INDEX idx_email_contacts_client ON public.email_contacts(client_id);
CREATE INDEX idx_email_contacts_status ON public.email_contacts(status);
CREATE INDEX idx_email_contacts_email ON public.email_contacts(email);
CREATE INDEX idx_email_contacts_tags ON public.email_contacts USING GIN(tags);

-- Trigger para updated_at
CREATE TRIGGER update_email_contacts_updated_at
  BEFORE UPDATE ON public.email_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RLS POLICIES PARA EMAIL_CONTACTS
-- =====================================================

ALTER TABLE public.email_contacts ENABLE ROW LEVEL SECURITY;

-- Admins têm acesso total
CREATE POLICY "email_contacts_admin_full"
  ON public.email_contacts
  FOR ALL
  USING (get_user_role() = 'admin');

-- Clientes podem ver seus próprios contatos
CREATE POLICY "email_contacts_client_select"
  ON public.email_contacts
  FOR SELECT
  USING (client_id = get_current_user_client_id() OR get_user_role() = 'admin');

-- Clientes podem inserir seus próprios contatos
CREATE POLICY "email_contacts_client_insert"
  ON public.email_contacts
  FOR INSERT
  WITH CHECK (client_id = get_current_user_client_id() OR get_user_role() = 'admin');

-- Clientes podem atualizar seus próprios contatos
CREATE POLICY "email_contacts_client_update"
  ON public.email_contacts
  FOR UPDATE
  USING (client_id = get_current_user_client_id() OR get_user_role() = 'admin');

-- Clientes podem deletar seus próprios contatos
CREATE POLICY "email_contacts_client_delete"
  ON public.email_contacts
  FOR DELETE
  USING (client_id = get_current_user_client_id() OR get_user_role() = 'admin');

-- =====================================================
-- ADICIONAR SEGMENTAÇÃO POR TAGS NAS CAMPANHAS
-- =====================================================

ALTER TABLE public.email_marketing_campaigns
ADD COLUMN contact_tags TEXT[] DEFAULT '{}',
ADD COLUMN target_all_contacts BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.email_marketing_campaigns.contact_tags IS 'Tags para segmentar destinatários da campanha';
COMMENT ON COLUMN public.email_marketing_campaigns.target_all_contacts IS 'Se true, envia para todos os contatos ativos; se false, filtra por tags';