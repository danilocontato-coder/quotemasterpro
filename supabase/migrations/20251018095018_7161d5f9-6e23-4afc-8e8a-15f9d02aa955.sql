-- Remover TODAS as políticas existentes das tabelas de e-mail marketing
DROP POLICY IF EXISTS "campaigns_admin_full_access" ON email_marketing_campaigns;
DROP POLICY IF EXISTS "campaigns_admin_access" ON email_marketing_campaigns;
DROP POLICY IF EXISTS "campaigns_client_access" ON email_marketing_campaigns;
DROP POLICY IF EXISTS "campaigns_client_select" ON email_marketing_campaigns;
DROP POLICY IF EXISTS "campaigns_insert" ON email_marketing_campaigns;
DROP POLICY IF EXISTS "campaigns_client_insert" ON email_marketing_campaigns;
DROP POLICY IF EXISTS "campaigns_client_update" ON email_marketing_campaigns;

DROP POLICY IF EXISTS "contacts_admin_full_access" ON email_contacts;
DROP POLICY IF EXISTS "contacts_admin_access" ON email_contacts;
DROP POLICY IF EXISTS "contacts_client_access" ON email_contacts;
DROP POLICY IF EXISTS "contacts_client_full_access" ON email_contacts;

DROP POLICY IF EXISTS "recipients_admin_full_access" ON email_campaign_recipients;
DROP POLICY IF EXISTS "recipients_campaign_access" ON email_campaign_recipients;
DROP POLICY IF EXISTS "recipients_insert" ON email_campaign_recipients;
DROP POLICY IF EXISTS "recipients_client_access" ON email_campaign_recipients;
DROP POLICY IF EXISTS "recipients_system_insert" ON email_campaign_recipients;

-- Criar políticas corretas para email_marketing_campaigns
CREATE POLICY "email_campaigns_admin_all" 
ON email_marketing_campaigns 
FOR ALL 
TO authenticated
USING (has_role_text(auth.uid(), 'admin'));

CREATE POLICY "email_campaigns_client_select" 
ON email_marketing_campaigns 
FOR SELECT 
TO authenticated
USING (client_id = get_current_user_client_id() OR has_role_text(auth.uid(), 'admin'));

CREATE POLICY "email_campaigns_client_insert" 
ON email_marketing_campaigns 
FOR INSERT 
TO authenticated
WITH CHECK (client_id = get_current_user_client_id() OR has_role_text(auth.uid(), 'admin'));

CREATE POLICY "email_campaigns_client_update" 
ON email_marketing_campaigns 
FOR UPDATE 
TO authenticated
USING (client_id = get_current_user_client_id() OR has_role_text(auth.uid(), 'admin'))
WITH CHECK (client_id = get_current_user_client_id() OR has_role_text(auth.uid(), 'admin'));

CREATE POLICY "email_campaigns_client_delete" 
ON email_marketing_campaigns 
FOR DELETE 
TO authenticated
USING (client_id = get_current_user_client_id() OR has_role_text(auth.uid(), 'admin'));

-- Criar políticas corretas para email_contacts
CREATE POLICY "email_contacts_admin_all" 
ON email_contacts 
FOR ALL 
TO authenticated
USING (has_role_text(auth.uid(), 'admin'));

CREATE POLICY "email_contacts_client_all" 
ON email_contacts 
FOR ALL 
TO authenticated
USING (client_id = get_current_user_client_id() OR has_role_text(auth.uid(), 'admin'))
WITH CHECK (client_id = get_current_user_client_id() OR has_role_text(auth.uid(), 'admin'));

-- Criar políticas corretas para email_campaign_recipients
CREATE POLICY "email_recipients_admin_all" 
ON email_campaign_recipients 
FOR ALL 
TO authenticated
USING (has_role_text(auth.uid(), 'admin'));

CREATE POLICY "email_recipients_client_select" 
ON email_campaign_recipients 
FOR SELECT 
TO authenticated
USING (
  has_role_text(auth.uid(), 'admin') OR
  campaign_id IN (
    SELECT id FROM email_marketing_campaigns 
    WHERE client_id = get_current_user_client_id()
  )
);

CREATE POLICY "email_recipients_client_insert" 
ON email_campaign_recipients 
FOR INSERT 
TO authenticated
WITH CHECK (
  has_role_text(auth.uid(), 'admin') OR
  campaign_id IN (
    SELECT id FROM email_marketing_campaigns 
    WHERE client_id = get_current_user_client_id()
  )
);

CREATE POLICY "email_recipients_client_update" 
ON email_campaign_recipients 
FOR UPDATE 
TO authenticated
USING (
  has_role_text(auth.uid(), 'admin') OR
  campaign_id IN (
    SELECT id FROM email_marketing_campaigns 
    WHERE client_id = get_current_user_client_id()
  )
);