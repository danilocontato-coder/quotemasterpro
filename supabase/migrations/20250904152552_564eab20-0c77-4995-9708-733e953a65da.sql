-- Inserir dados de exemplo para teste do módulo de cotações
-- Primeiro, vamos inserir clientes usando planos existentes
INSERT INTO clients (id, name, cnpj, email, phone, address, subscription_plan_id, status)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Construtora São Paulo Ltda', '11111111000111', 'contato@construtorasp.com.br', '+55 11 3333-1111', 'Rua das Flores, 123 - São Paulo/SP', 'plan-pro', 'active'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Condomínio Residencial Verde', '22222222000222', 'admin@condominioverde.com.br', '+55 11 3333-2222', 'Av. Central, 456 - São Paulo/SP', 'plan-enterprise', 'active')
ON CONFLICT (id) DO NOTHING;

-- Inserir cotações de exemplo
INSERT INTO quotes (id, title, description, client_id, client_name, status, total, deadline, created_at, updated_at, supplier_scope)
VALUES 
  ('RFQ001', 'Materiais para Construção Civil', 'Solicito cotação para materiais de construção civil conforme lista em anexo', '550e8400-e29b-41d4-a716-446655440001', 'Construtora São Paulo Ltda', 'sent', 15000.00, NOW() + INTERVAL '15 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'global'),
  ('RFQ002', 'Ferramentas e Equipamentos', 'Cotação para ferramentas e equipamentos para manutenção predial', '550e8400-e29b-41d4-a716-446655440002', 'Condomínio Residencial Verde', 'receiving', 8500.00, NOW() + INTERVAL '10 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'global'),
  ('RFQ003', 'Material Elétrico', 'Materiais elétricos para instalação predial', '550e8400-e29b-41d4-a716-446655440001', 'Construtora São Paulo Ltda', 'under_review', 12000.00, NOW() + INTERVAL '20 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', 'global')
ON CONFLICT (id) DO NOTHING;

-- Inserir itens das cotações
INSERT INTO quote_items (quote_id, product_name, quantity, unit_price, total)
VALUES 
  ('RFQ001', 'Cimento CP-II 50kg', 100, 35.50, 3550.00),
  ('RFQ001', 'Areia Média m³', 50, 45.00, 2250.00),
  ('RFQ001', 'Brita 1 m³', 30, 65.00, 1950.00),
  ('RFQ001', 'Tijolo Cerâmico 8 furos', 5000, 1.50, 7500.00),
  
  ('RFQ002', 'Furadeira de Impacto 1/2"', 3, 450.00, 1350.00),
  ('RFQ002', 'Martelo Demolidor', 2, 1200.00, 2400.00),
  ('RFQ002', 'Parafusadeira Elétrica', 5, 280.00, 1400.00),
  ('RFQ002', 'Alicate Universal', 10, 35.00, 350.00),
  
  ('RFQ003', 'Cabo Flexível 2,5mm', 500, 8.50, 4250.00),
  ('RFQ003', 'Disjuntor 20A', 25, 45.00, 1125.00),
  ('RFQ003', 'Tomada 2P+T 10A', 50, 12.00, 600.00),
  ('RFQ003', 'Interruptor Simples', 30, 8.50, 255.00)
ON CONFLICT DO NOTHING;