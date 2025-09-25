-- Fix RLS for system_settings to use proper admin check
-- Enable RLS (idempotent)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop legacy policies
DROP POLICY IF EXISTS system_settings_admin_all ON public.system_settings;
DROP POLICY IF EXISTS system_settings_superadmin_access ON public.system_settings;

-- Create admin-only policies using get_user_role()
CREATE POLICY system_settings_admin_all
ON public.system_settings
FOR ALL
USING (public.get_user_role() = 'admin');

-- Insert default branding settings if they don't exist
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('branding', '{
    "companyName": "QuoteMaster Pro",
    "primaryColor": "#003366",
    "secondaryColor": "#F5F5F5",
    "accentColor": "#003366",
    "logoUrl": "",
    "faviconUrl": "",
    "customCss": ""
  }'::jsonb, 'Configurações globais de branding da plataforma')
ON CONFLICT (setting_key) DO NOTHING;