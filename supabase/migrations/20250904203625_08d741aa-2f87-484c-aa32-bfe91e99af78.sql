-- Criar profile para o fornecedor logado
INSERT INTO profiles (id, email, name, role, supplier_id)
SELECT 
  '1e017a63-c5a4-4d5b-a7f4-00a4c0f8a900'::uuid,
  'vendas@alphamateriais.com',
  'Alpha Materiais',
  'supplier',
  s.id
FROM suppliers s 
WHERE s.email = 'vendas@alphamateriais.com'
ON CONFLICT (id) DO UPDATE SET
  supplier_id = EXCLUDED.supplier_id,
  role = 'supplier';

-- Atualizar todos os produtos existentes sem supplier_id para o fornecedor correto
-- baseado no client_id que parece estar sendo usado
UPDATE products 
SET supplier_id = s.id
FROM suppliers s
WHERE products.supplier_id IS NULL 
  AND products.client_id IS NOT NULL 
  AND s.email = 'vendas@alphamateriais.com';