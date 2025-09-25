-- Criar tabela para configurações de branding individuais por cliente/fornecedor
CREATE TABLE IF NOT EXISTS public.branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  company_name TEXT,
  primary_color TEXT DEFAULT '#003366',
  secondary_color TEXT DEFAULT '#F5F5F5', 
  accent_color TEXT DEFAULT '#003366',
  logo_url TEXT,
  favicon_url TEXT,
  custom_css TEXT,
  footer_text TEXT,
  login_page_title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Garantir que não pode ter client_id e supplier_id ao mesmo tempo
  CONSTRAINT branding_settings_exclusive_owner CHECK (
    (client_id IS NOT NULL AND supplier_id IS NULL) OR 
    (client_id IS NULL AND supplier_id IS NOT NULL)
  ),
  
  -- Garantir um branding por cliente/fornecedor
  UNIQUE(client_id),
  UNIQUE(supplier_id)
);

-- Trigger para updated_at
CREATE TRIGGER update_branding_settings_updated_at
  BEFORE UPDATE ON public.branding_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- Admins podem tudo
CREATE POLICY branding_settings_admin_all
ON public.branding_settings
FOR ALL
USING (public.get_user_role() = 'admin');

-- Clientes podem gerenciar suas configurações
CREATE POLICY branding_settings_client_access
ON public.branding_settings
FOR ALL
USING (client_id IN (
  SELECT profiles.client_id 
  FROM public.profiles 
  WHERE profiles.id = auth.uid()
))
WITH CHECK (client_id IN (
  SELECT profiles.client_id 
  FROM public.profiles 
  WHERE profiles.id = auth.uid()
));

-- Fornecedores podem gerenciar suas configurações
CREATE POLICY branding_settings_supplier_access
ON public.branding_settings
FOR ALL
USING (supplier_id = public.get_current_user_supplier_id())
WITH CHECK (supplier_id = public.get_current_user_supplier_id());

-- Todos podem ver configurações (para aplicar branding quando necessário)
CREATE POLICY branding_settings_public_read
ON public.branding_settings
FOR SELECT
USING (true);