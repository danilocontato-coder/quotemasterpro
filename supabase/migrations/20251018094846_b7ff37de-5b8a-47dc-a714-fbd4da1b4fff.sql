-- Corrigir políticas RLS para email_marketing_campaigns
DROP POLICY IF EXISTS "campaigns_admin_access" ON email_marketing_campaigns;
DROP POLICY IF EXISTS "campaigns_client_access" ON email_marketing_campaigns;
DROP POLICY IF EXISTS "campaigns_insert" ON email_marketing_campaigns;

-- Admins têm acesso total
CREATE POLICY "campaigns_admin_full_access" 
ON email_marketing_campaigns 
FOR ALL 
USING (has_role_text(auth.uid(), 'admin'));

-- Clientes podem ver e criar suas próprias campanhas
CREATE POLICY "campaigns_client_select" 
ON email_marketing_campaigns 
FOR SELECT 
USING (client_id = get_current_user_client_id());

CREATE POLICY "campaigns_client_insert" 
ON email_marketing_campaigns 
FOR INSERT 
WITH CHECK (client_id = get_current_user_client_id());

CREATE POLICY "campaigns_client_update" 
ON email_marketing_campaigns 
FOR UPDATE 
USING (client_id = get_current_user_client_id());

-- Corrigir políticas RLS para email_contacts
DROP POLICY IF EXISTS "contacts_admin_access" ON email_contacts;
DROP POLICY IF EXISTS "contacts_client_access" ON email_contacts;

-- Admins têm acesso total
CREATE POLICY "contacts_admin_full_access" 
ON email_contacts 
FOR ALL 
USING (has_role_text(auth.uid(), 'admin'));

-- Clientes podem ver e gerenciar seus próprios contatos
CREATE POLICY "contacts_client_full_access" 
ON email_contacts 
FOR ALL 
USING (client_id = get_current_user_client_id())
WITH CHECK (client_id = get_current_user_client_id());

-- Corrigir políticas RLS para email_campaign_recipients
DROP POLICY IF EXISTS "recipients_campaign_access" ON email_campaign_recipients;
DROP POLICY IF EXISTS "recipients_insert" ON email_campaign_recipients;

-- Admins têm acesso total
CREATE POLICY "recipients_admin_full_access" 
ON email_campaign_recipients 
FOR ALL 
USING (has_role_text(auth.uid(), 'admin'));

-- Acesso baseado na campanha do cliente
CREATE POLICY "recipients_client_access" 
ON email_campaign_recipients 
FOR SELECT 
USING (
  campaign_id IN (
    SELECT id FROM email_marketing_campaigns 
    WHERE client_id = get_current_user_client_id()
  )
);

CREATE POLICY "recipients_system_insert" 
ON email_campaign_recipients 
FOR INSERT 
WITH CHECK (
  campaign_id IN (
    SELECT id FROM email_marketing_campaigns 
    WHERE client_id = get_current_user_client_id()
  )
);

-- Garantir que a função has_role_text existe
CREATE OR REPLACE FUNCTION public.has_role_text(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = _role
  )
$$;