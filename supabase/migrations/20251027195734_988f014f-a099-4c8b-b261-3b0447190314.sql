-- ============================================
-- Fase 1: Adicionar Termos de Uso ao Fluxo de Primeiro Acesso
-- ============================================

-- 1. Adicionar campos de aceitação de termos na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;

-- 2. Inserir termos de uso padrão em system_settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'terms_of_use',
  jsonb_build_object(
    'title', 'Termos de Uso da Plataforma Cotiz',
    'content', E'## Bem-vindo à Cotiz\n\n### 1. Aceitação dos Termos\nAo utilizar nossa plataforma, você concorda com estes Termos de Uso. Se você não concorda, não utilize a plataforma.\n\n### 2. Descrição do Serviço\nA Cotiz é uma plataforma corporativa de gestão de cotações e orçamentos para empresas e condomínios, oferecendo:\n- Gestão eficiente de cotações\n- Automação de processos\n- Colaboração entre equipes\n- Sistema seguro e escalável\n\n### 3. Responsabilidades do Usuário\n- Manter suas credenciais de acesso em sigurança\n- Fornecer informações precisas e atualizadas\n- Não compartilhar sua conta com terceiros\n- Usar a plataforma de forma ética e legal\n\n### 4. Proteção de Dados (LGPD/GDPR)\n- Coletamos apenas dados necessários para o funcionamento da plataforma\n- Seus dados são armazenados de forma segura\n- Você pode solicitar exportação ou exclusão de seus dados\n- Chaves de API são sempre criptografadas\n\n### 5. Propriedade Intelectual\nTodos os direitos da plataforma Cotiz são reservados.\n\n### 6. Limitação de Responsabilidade\nA Cotiz não se responsabiliza por:\n- Uso inadequado da plataforma\n- Decisões comerciais tomadas com base nos dados\n- Problemas causados por terceiros\n\n### 7. Modificações dos Termos\nReservamo-nos o direito de modificar estes termos a qualquer momento. Usuários serão notificados sobre mudanças significativas.\n\n### 8. Contato\nEm caso de dúvidas, entre em contato através dos canais de suporte disponíveis na plataforma.\n\n---\n\n**Última atualização:** ' || to_char(CURRENT_DATE, 'DD/MM/YYYY'),
    'version', '1.0',
    'last_updated', to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ),
  'Termos de uso da plataforma exibidos no primeiro acesso'
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();

-- 3. Criar política RLS para permitir leitura dos termos por usuários autenticados
DROP POLICY IF EXISTS "users_can_read_terms" ON public.system_settings;
CREATE POLICY "users_can_read_terms"
ON public.system_settings FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND setting_key = 'terms_of_use'
);

-- 4. Criar política RLS para permitir atualização de terms_accepted por usuários autenticados (apenas seu próprio registro)
DROP POLICY IF EXISTS "users_can_update_own_terms_acceptance" ON public.profiles;
CREATE POLICY "users_can_update_own_terms_acceptance"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Comentários para documentação
COMMENT ON COLUMN public.profiles.terms_accepted IS 'Indica se o usuário aceitou os termos de uso da plataforma';
COMMENT ON COLUMN public.profiles.terms_accepted_at IS 'Data e hora em que o usuário aceitou os termos de uso';