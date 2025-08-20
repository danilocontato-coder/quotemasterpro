-- Inserir apenas dados base (não usuários)

-- Inserir planos de assinatura
INSERT INTO subscription_plans (id, name, display_name, description, monthly_price, yearly_price, max_users, max_suppliers, max_quotes, max_storage_gb, features, is_popular, target_audience, status) VALUES
('plan-basic', 'basic', 'Básico', 'Plano ideal para pequenos condomínios', 99.0, 990.0, 3, 10, 50, 5, '["PDF Export", "Suporte via E-mail", "Dashboard Básico"]', false, 'clients', 'active'),
('plan-pro', 'professional', 'Profissional', 'Plano completo para condomínios médios', 199.0, 1990.0, 10, 25, 200, 20, '["PDF Export", "Suporte Prioritário", "Dashboard Avançado", "Relatórios", "API Access"]', true, 'clients', 'active'),
('plan-enterprise', 'enterprise', 'Enterprise', 'Solução completa para grandes condomínios', 399.0, 3990.0, 50, 100, 1000, 100, '["PDF Export", "Suporte Dedicado", "Dashboard Premium", "Relatórios Avançados", "API Access", "Integrações Customizadas"]', false, 'clients', 'active'),
('supplier-basic', 'supplier-basic', 'Fornecedor Básico', 'Plano gratuito para fornecedores', 0.0, 0.0, 1, 0, 20, 2, '["Responder Cotações", "Chat Básico"]', false, 'suppliers', 'active'),
('supplier-pro', 'supplier-pro', 'Fornecedor Pro', 'Plano premium para fornecedores', 49.0, 490.0, 3, 0, 100, 10, '["Responder Cotações", "Chat Avançado", "Analytics", "Catálogo de Produtos"]', true, 'suppliers', 'active')
ON CONFLICT (id) DO NOTHING;

-- Inserir clientes de teste
DO $$
DECLARE
  client1_uuid uuid := '550e8400-e29b-41d4-a716-446655440001';
  client2_uuid uuid := '550e8400-e29b-41d4-a716-446655440002';
  client3_uuid uuid := '550e8400-e29b-41d4-a716-446655440003';
BEGIN
  INSERT INTO clients (id, name, cnpj, email, phone, address, subscription_plan_id, status) VALUES
  (client1_uuid, 'Condomínio Residencial Azul', '12.345.678/0001-90', 'contato@condominioazul.com', '+55 11 98765-4321', 'Rua das Flores, 123 - São Paulo/SP', 'plan-pro', 'active'),
  (client2_uuid, 'Condomínio Vila Verde', '98.765.432/0001-10', 'admin@vilaverde.com', '+55 11 91234-5678', 'Av. Central, 456 - São Paulo/SP', 'plan-basic', 'active'),
  (client3_uuid, 'Edifício Comercial Prime', '11.222.333/0001-44', 'gestao@edificioprime.com', '+55 11 99999-0000', 'Rua Comercial, 789 - São Paulo/SP', 'plan-enterprise', 'active')
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Inserir fornecedores de teste
DO $$
DECLARE
  supplier1_uuid uuid := '550e8400-e29b-41d4-a716-446655440011';
  supplier2_uuid uuid := '550e8400-e29b-41d4-a716-446655440012';
  supplier3_uuid uuid := '550e8400-e29b-41d4-a716-446655440013';
BEGIN
  INSERT INTO suppliers (id, name, cnpj, email, phone, whatsapp, address, specialties, subscription_plan_id, status, rating, completed_orders, region, type) VALUES
  (supplier1_uuid, 'Alpha Materiais de Construção', '22.333.444/0001-55', 'vendas@alphamateriais.com', '+55 11 3333-4444', '+55 11 99999-1111', '{"street": "Rua Industrial, 100", "city": "São Paulo", "state": "SP", "zipCode": "01000-000"}', ARRAY['Materiais de Construção', 'Ferramentas'], 'supplier-pro', 'active', 4.8, 125, 'sudeste', 'local'),
  (supplier2_uuid, 'Beta Limpeza Profissional', '33.444.555/0001-66', 'atendimento@betalimpeza.com', '+55 11 4444-5555', '+55 11 99999-2222', '{"street": "Av. Limpeza, 200", "city": "São Paulo", "state": "SP", "zipCode": "02000-000"}', ARRAY['Produtos de Limpeza', 'Equipamentos'], 'supplier-basic', 'active', 4.5, 89, 'sudeste', 'local'),
  (supplier3_uuid, 'Gamma Jardinagem', '44.555.666/0001-77', 'contato@gammajardinagem.com', '+55 11 5555-6666', '+55 11 99999-3333', '{"street": "Rua Verde, 300", "city": "São Paulo", "state": "SP", "zipCode": "03000-000"}', ARRAY['Jardinagem', 'Paisagismo'], 'supplier-pro', 'active', 4.9, 67, 'sudeste', 'local')
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Inserir produtos de exemplo
DO $$
DECLARE
  supplier1_uuid uuid := '550e8400-e29b-41d4-a716-446655440011';
  supplier2_uuid uuid := '550e8400-e29b-41d4-a716-446655440012';
BEGIN
  INSERT INTO products (name, code, description, category, unit_price, stock_quantity, supplier_id, status) VALUES
  ('Cimento CP-II 50kg', 'CIM-001', 'Cimento Portland CP-II para uso geral em construção civil', 'Materiais de Construção', 25.90, 150, supplier1_uuid, 'active'),
  ('Detergente Neutro 5L', 'LIMP-001', 'Detergente neutro concentrado para limpeza geral', 'Produtos de Limpeza', 45.50, 80, supplier2_uuid, 'active'),
  ('Areia Fina - m³', 'ARE-001', 'Areia fina para acabamento e argamassa', 'Materiais de Construção', 65.00, 25, supplier1_uuid, 'active'),
  ('Desinfetante 2L', 'LIMP-002', 'Desinfetante multiuso com fragrância suave', 'Produtos de Limpeza', 28.90, 120, supplier2_uuid, 'active')
  ON CONFLICT (code) DO NOTHING;
END $$;