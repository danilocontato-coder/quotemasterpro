-- Corrigir vinculações dos usuários existentes
DO $$
DECLARE
  client1_id uuid;
  client2_id uuid;
  supplier1_id uuid;
  admin_user_id uuid;
  client_user_id uuid;
  supplier_user_id uuid;
BEGIN
  -- Buscar IDs dos clientes e fornecedores
  SELECT id INTO client1_id FROM clients WHERE email = 'contato@condominioazul.com';
  SELECT id INTO supplier1_id FROM suppliers WHERE email = 'vendas@alphamateriais.com';
  
  -- Atualizar usuário gestor do condomínio
  UPDATE profiles 
  SET client_id = client1_id, role = 'client'
  WHERE email = 'gestor@condominioazul.com';
  
  -- Atualizar usuário fornecedor
  UPDATE profiles 
  SET supplier_id = supplier1_id, role = 'supplier', client_id = null
  WHERE email = 'vendas@alphamateriais.com';
  
  -- Atualizar usuário admin
  UPDATE profiles 
  SET role = 'admin'
  WHERE email = 'admin@quotemaster.com';
  
  -- Buscar IDs dos usuários atualizados
  SELECT id INTO client_user_id FROM profiles WHERE email = 'gestor@condominioazul.com';
  SELECT id INTO supplier_user_id FROM profiles WHERE email = 'vendas@alphamateriais.com';
  
  -- Criar cotações de exemplo se não existirem
  IF client_user_id IS NOT NULL AND client1_id IS NOT NULL THEN
    INSERT INTO quotes (id, title, description, client_id, client_name, created_by, status, total, deadline, items_count, responses_count) 
    VALUES 
    ('quote-001', 'Materiais para Reforma da Portaria', 'Cotação para materiais de construção necessários para reforma da portaria do condomínio', client1_id, 'Condomínio Residencial Azul', client_user_id, 'draft', 2750.50, now() + interval '15 days', 3, 0),
    ('quote-002', 'Produtos de Limpeza Mensal', 'Cotação para produtos de limpeza do condomínio - compra mensal', client1_id, 'Condomínio Residencial Azul', client_user_id, 'sent', 1890.00, now() + interval '10 days', 4, 1),
    ('quote-003', 'Manutenção Jardim', 'Serviços de jardinagem e paisagismo para áreas comuns', client1_id, 'Condomínio Residencial Azul', client_user_id, 'under_review', 850.00, now() + interval '7 days', 2, 1)
    ON CONFLICT (id) DO NOTHING;
    
    -- Criar itens das cotações
    INSERT INTO quote_items (quote_id, product_name, quantity, unit_price, total) VALUES
    ('quote-001', 'Cimento CP-II 50kg', 20, 25.90, 518.00),
    ('quote-001', 'Areia Fina - m³', 15, 65.00, 975.00),
    ('quote-001', 'Tinta Acrílica 18L', 8, 145.50, 1164.00),
    ('quote-002', 'Detergente Neutro 5L', 10, 45.50, 455.00),
    ('quote-002', 'Desinfetante 2L', 20, 28.90, 578.00),
    ('quote-002', 'Papel Higiênico - Fardo', 5, 89.50, 447.50),
    ('quote-002', 'Sabonete Líquido 5L', 8, 52.00, 416.00),
    ('quote-003', 'Grama em Placas - m²', 50, 12.50, 625.00),
    ('quote-003', 'Substrato para Plantas', 15, 15.00, 225.00)
    ON CONFLICT (id) DO NOTHING;
    
    -- Criar aprovações pendentes
    INSERT INTO approvals (quote_id, approver_id, status, comments) VALUES
    ('quote-002', client_user_id, 'pending', 'Aguardando aprovação do orçamento'),
    ('quote-003', client_user_id, 'approved', 'Aprovado para execução imediata')
    ON CONFLICT DO NOTHING;
    
    -- Criar pagamentos
    INSERT INTO payments (id, quote_id, client_id, supplier_id, amount, status) VALUES
    ('pay-001', 'quote-002', client1_id, supplier1_id, 1890.00, 'pending'),
    ('pay-002', 'quote-003', client1_id, supplier1_id, 850.00, 'completed')
    ON CONFLICT (id) DO NOTHING;
    
    -- Criar notificações
    INSERT INTO notifications (user_id, title, message, type, priority, action_url, read, metadata) VALUES
    (client_user_id, 'Nova Cotação Aprovada', 'Sua cotação "Manutenção Jardim" foi aprovada', 'quote_approved', 'high', '/quotes/quote-003', false, '{"quote_id": "quote-003"}'),
    (client_user_id, 'Pagamento Pendente', 'Pagamento da cotação "Produtos de Limpeza Mensal" está aguardando processamento', 'payment_pending', 'medium', '/payments/pay-001', false, '{"payment_id": "pay-001"}'),
    (supplier_user_id, 'Nova Cotação Recebida', 'Você recebeu uma nova solicitação de cotação', 'quote_received', 'high', '/supplier/quotes', false, '{"quote_id": "quote-002"}')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;