-- Verificar se tabela subscription_plans tem todas as colunas necessárias
-- Adicionar colunas que faltam para funcionalidade completa

-- Adicionar colunas para customizações e estatísticas se não existirem
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS allow_branding boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_custom_domain boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_color text,
ADD COLUMN IF NOT EXISTS active_clients integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_revenue numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS clients_subscribed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS suppliers_subscribed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_quotes_per_month integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS max_users_per_client integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS max_suppliers_per_quote integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS max_quote_responses_per_month integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS max_products_in_catalog integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_categories_per_supplier integer DEFAULT 10;

-- Criar políticas RLS para permitir operações de admin
CREATE POLICY IF NOT EXISTS "subscription_plans_admin_all" 
ON public.subscription_plans 
FOR ALL 
USING (get_user_role() = 'admin');

-- Inserir planos padrão se a tabela estiver vazia
INSERT INTO public.subscription_plans (
  id, name, display_name, description, target_audience, status,
  monthly_price, yearly_price, max_quotes, max_suppliers, max_users, max_storage_gb,
  max_quotes_per_month, max_users_per_client, max_suppliers_per_quote, 
  max_quote_responses_per_month, max_products_in_catalog, max_categories_per_supplier,
  is_popular, allow_branding, allow_custom_domain, active_clients, total_revenue,
  features
) VALUES 
(
  'basic', 'basic', 'Plano Básico', 
  'Ideal para condomínios pequenos que estão começando',
  'clients', 'active', 99.90, 999.00, 50, 10, 3, 5,
  50, 3, 5, 50, 100, 10,
  false, false, false, 150, 14985.00,
  '["Até 50 cotações por mês", "Até 10 fornecedores", "Até 3 usuários", "Suporte por email", "Relatórios básicos"]'::jsonb
),
(
  'premium', 'premium', 'Plano Premium',
  'Perfeito para condomínios médios com necessidades avançadas', 
  'clients', 'active', 199.90, 1999.00, 200, 50, 10, 20,
  200, 10, 15, 200, 500, 25,
  true, true, false, 89, 17791.00,
  '["Até 200 cotações por mês", "Até 50 fornecedores", "Até 10 usuários", "Suporte prioritário", "Relatórios avançados", "Análise de mercado", "Integração WhatsApp", "Backup automático"]'::jsonb
),
(
  'enterprise', 'enterprise', 'Plano Enterprise',
  'Solução completa para grandes condomínios e administradoras',
  'clients', 'active', 399.90, 3999.00, -1, -1, -1, 100,
  -1, -1, -1, -1, -1, -1,
  false, true, true, 23, 9197.00,
  '["Cotações ilimitadas", "Fornecedores ilimitados", "Usuários ilimitados", "Suporte 24/7", "Relatórios personalizados", "API completa", "Integrações avançadas", "Manager dedicado", "Treinamento incluído"]'::jsonb
),
(
  'supplier-basic', 'supplier-basic', 'Fornecedor Básico',
  'Plano básico para fornecedores iniciantes',
  'suppliers', 'active', 49.90, 499.00, 30, 0, 2, 3,
  30, 0, 0, 30, 50, 5,
  false, false, false, 45, 2245.50,
  '["Até 30 respostas por mês", "Até 2 usuários", "Catálogo básico", "Suporte por email"]'::jsonb
),
(
  'supplier-pro', 'supplier-pro', 'Fornecedor Profissional', 
  'Plano avançado para fornecedores estabelecidos',
  'suppliers', 'active', 99.90, 999.00, 100, 0, 5, 10,
  100, 0, 0, 100, 200, 15,
  true, true, false, 67, 6693.30,
  '["Até 100 respostas por mês", "Até 5 usuários", "Catálogo avançado", "Análise de mercado", "Suporte prioritário", "Integração WhatsApp"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;