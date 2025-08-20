-- Inserir planos de assinatura primeiro
INSERT INTO subscription_plans (id, name, display_name, description, monthly_price, yearly_price, max_users, max_suppliers, max_quotes, max_storage_gb, features, is_popular, target_audience, status) VALUES
('plan-basic', 'basic', 'Básico', 'Plano ideal para pequenos condomínios', 99.0, 990.0, 3, 10, 50, 5, '["PDF Export", "Suporte via E-mail", "Dashboard Básico"]', false, 'clients', 'active'),
('plan-pro', 'professional', 'Profissional', 'Plano completo para condomínios médios', 199.0, 1990.0, 10, 25, 200, 20, '["PDF Export", "Suporte Prioritário", "Dashboard Avançado", "Relatórios", "API Access"]', true, 'clients', 'active'),
('plan-enterprise', 'enterprise', 'Enterprise', 'Solução completa para grandes condomínios', 399.0, 3990.0, 50, 100, 1000, 100, '["PDF Export", "Suporte Dedicado", "Dashboard Premium", "Relatórios Avançados", "API Access", "Integrações Customizadas"]', false, 'clients', 'active'),
('supplier-basic', 'supplier-basic', 'Fornecedor Básico', 'Plano gratuito para fornecedores', 0.0, 0.0, 1, 0, 20, 2, '["Responder Cotações", "Chat Básico"]', false, 'suppliers', 'active'),
('supplier-pro', 'supplier-pro', 'Fornecedor Pro', 'Plano premium para fornecedores', 49.0, 490.0, 3, 0, 100, 10, '["Responder Cotações", "Chat Avançado", "Analytics", "Catálogo de Produtos"]', true, 'suppliers', 'active');

-- Inserir clientes de teste
INSERT INTO clients (id, name, cnpj, email, phone, address, subscription_plan_id, status) VALUES
(gen_random_uuid(), 'Condomínio Residencial Azul', '12.345.678/0001-90', 'contato@condominioazul.com', '+55 11 98765-4321', 'Rua das Flores, 123 - São Paulo/SP', 'plan-pro', 'active'),
(gen_random_uuid(), 'Condomínio Vila Verde', '98.765.432/0001-10', 'admin@vilaverde.com', '+55 11 91234-5678', 'Av. Central, 456 - São Paulo/SP', 'plan-basic', 'active'),
(gen_random_uuid(), 'Edifício Comercial Prime', '11.222.333/0001-44', 'gestao@edificioprime.com', '+55 11 99999-0000', 'Rua Comercial, 789 - São Paulo/SP', 'plan-enterprise', 'active');

-- Inserir fornecedores de teste
INSERT INTO suppliers (id, name, cnpj, email, phone, whatsapp, address, specialties, subscription_plan_id, status, rating, completed_orders, region, type) VALUES
(gen_random_uuid(), 'Alpha Materiais de Construção', '22.333.444/0001-55', 'vendas@alphamateriais.com', '+55 11 3333-4444', '+55 11 99999-1111', '{"street": "Rua Industrial, 100", "city": "São Paulo", "state": "SP", "zipCode": "01000-000"}', ARRAY['Materiais de Construção', 'Ferramentas'], 'supplier-pro', 'active', 4.8, 125, 'sudeste', 'local'),
(gen_random_uuid(), 'Beta Limpeza Profissional', '33.444.555/0001-66', 'atendimento@betalimpeza.com', '+55 11 4444-5555', '+55 11 99999-2222', '{"street": "Av. Limpeza, 200", "city": "São Paulo", "state": "SP", "zipCode": "02000-000"}', ARRAY['Produtos de Limpeza', 'Equipamentos'], 'supplier-basic', 'active', 4.5, 89, 'sudeste', 'local'),
(gen_random_uuid(), 'Gamma Jardinagem', '44.555.666/0001-77', 'contato@gammajardinagem.com', '+55 11 5555-6666', '+55 11 99999-3333', '{"street": "Rua Verde, 300", "city": "São Paulo", "state": "SP", "zipCode": "03000-000"}', ARRAY['Jardinagem', 'Paisagismo'], 'supplier-pro', 'active', 4.9, 67, 'sudeste', 'local');

-- Criar função para inserir usuário de teste (simulando signup)
CREATE OR REPLACE FUNCTION create_test_user(
  test_email text,
  test_name text,
  test_role text,
  test_client_id uuid DEFAULT NULL,
  test_supplier_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  new_user_id uuid;
  client_uuid uuid;
  supplier_uuid uuid;
BEGIN
  -- Gerar um UUID para o usuário
  new_user_id := gen_random_uuid();
  
  -- Buscar IDs se necessário
  IF test_role = 'client' AND test_client_id IS NULL THEN
    SELECT id INTO client_uuid FROM clients LIMIT 1;
  ELSE
    client_uuid := test_client_id;
  END IF;
  
  IF test_role = 'supplier' AND test_supplier_id IS NULL THEN
    SELECT id INTO supplier_uuid FROM suppliers LIMIT 1;
  ELSE  
    supplier_uuid := test_supplier_id;
  END IF;
  
  -- Inserir o perfil do usuário
  INSERT INTO profiles (id, email, name, role, client_id, supplier_id, active)
  VALUES (new_user_id, test_email, test_name, test_role, client_uuid, supplier_uuid, true);
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar usuários de teste
DO $$
DECLARE
  client1_id uuid;
  client2_id uuid;
  supplier1_id uuid;
  supplier2_id uuid;
BEGIN
  -- Pegar IDs dos clientes e fornecedores
  SELECT id INTO client1_id FROM clients WHERE name = 'Condomínio Residencial Azul';
  SELECT id INTO client2_id FROM clients WHERE name = 'Condomínio Vila Verde';  
  SELECT id INTO supplier1_id FROM suppliers WHERE name = 'Alpha Materiais de Construção';
  SELECT id INTO supplier2_id FROM suppliers WHERE name = 'Beta Limpeza Profissional';
  
  -- Criar usuários de teste
  PERFORM create_test_user('admin@quotemaster.com', 'Admin QuoteMaster', 'admin');
  PERFORM create_test_user('gestor@condominioazul.com', 'João Silva - Gestor', 'client', client1_id);
  PERFORM create_test_user('colaborador@condominioazul.com', 'Maria Santos - Colaboradora', 'client', client1_id);
  PERFORM create_test_user('gestor@vilaverde.com', 'Pedro Costa - Síndico', 'client', client2_id);
  PERFORM create_test_user('vendas@alphamateriais.com', 'Carlos Alpha - Vendas', 'supplier', NULL, supplier1_id);
  PERFORM create_test_user('atendimento@betalimpeza.com', 'Ana Beta - Atendimento', 'supplier', NULL, supplier2_id);
END $$;

-- Inserir algumas cotações de exemplo
INSERT INTO quotes (id, title, description, client_id, client_name, created_by, status, total, deadline, items_count, responses_count) 
SELECT 
  'quote-' || generate_random_uuid()::text,
  'Materiais para Reforma da Portaria',
  'Cotação para materiais de construção necessários para reforma da portaria do condomínio',
  c.id,
  c.name,
  p.id,
  'draft',
  0,
  now() + interval '15 days',
  0,
  0
FROM clients c 
JOIN profiles p ON p.client_id = c.id AND p.role = 'client'
LIMIT 1;

-- Inserir produtos de exemplo
INSERT INTO products (name, code, description, category, unit_price, stock_quantity, supplier_id, status)
SELECT 
  'Cimento CP-II 50kg',
  'CIM-001',
  'Cimento Portland CP-II para uso geral em construção civil',
  'Materiais de Construção',
  25.90,
  150,
  s.id,
  'active'
FROM suppliers s 
WHERE s.name = 'Alpha Materiais de Construção'
UNION ALL
SELECT 
  'Detergente Neutro 5L',
  'LIMP-001', 
  'Detergente neutro concentrado para limpeza geral',
  'Produtos de Limpeza',
  45.50,
  80,
  s.id,
  'active'
FROM suppliers s 
WHERE s.name = 'Beta Limpeza Profissional';

-- Remover a função temporária
DROP FUNCTION create_test_user(text, text, text, uuid, uuid);