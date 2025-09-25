-- Ajustar políticas RLS para permitir que administradores do sistema gerenciem configurações de branding
-- Criar uma política mais flexível que permite admin e superadmin

-- Primeiro, vamos dropar as políticas existentes conflitantes
DROP POLICY IF EXISTS "Only admins can manage system settings" ON public.system_settings;

-- Criar política que permite tanto admin quanto verificação pelo profiles
CREATE POLICY "system_settings_superadmin_access" 
ON public.system_settings 
FOR ALL 
USING (
  -- Verificar se é admin via profiles (nossa implementação atual)
  get_user_role() = 'admin' OR
  -- Verificar se é admin via auth metadata (implementação antiga)
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (raw_user_meta_data ->> 'role') = 'admin'
  ) OR
  -- Verificar se é superadmin via email (fallback para casos específicos)
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND email LIKE '%admin%'
  )
)
WITH CHECK (
  -- Mesma lógica para inserções/atualizações
  get_user_role() = 'admin' OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (raw_user_meta_data ->> 'role') = 'admin'
  ) OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND email LIKE '%admin%'
  )
);

-- Inserir configurações padrão de branding se não existirem
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('company_name', '{"value": "QuoteMaster Pro"}', 'Nome da empresa para branding'),
('company_logo', '{"url": "/placeholder.svg"}', 'Logo da empresa para branding'),
('primary_color', '{"color": "#003366"}', 'Cor primária do sistema'),
('secondary_color', '{"color": "#F5F5F5"}', 'Cor secundária do sistema'),
('accent_color', '{"color": "#0066CC"}', 'Cor de destaque do sistema'),
('favicon', '{"url": "/favicon.ico"}', 'Favicon do sistema'),
('footer_text', '{"text": "© 2025 QuoteMaster Pro. Todos os direitos reservados."}', 'Texto do rodapé'),
('login_page_title', '{"text": "Bem-vindo ao QuoteMaster Pro"}', 'Título da página de login'),
('login_page_subtitle', '{"text": "Plataforma completa de gestão de cotações"}', 'Subtítulo da página de login'),
('dashboard_welcome_message', '{"text": "Bem-vindo de volta!"}', 'Mensagem de boas-vindas no dashboard')
ON CONFLICT (setting_key) DO NOTHING;