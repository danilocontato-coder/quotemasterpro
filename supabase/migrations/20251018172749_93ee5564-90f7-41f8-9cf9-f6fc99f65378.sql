-- Deletar fornecedor de teste e TODOS os dados vinculados
-- Este fornecedor foi criado antes das correções implementadas

-- 1. Deletar usuários vinculados (tabela users)
DELETE FROM users WHERE supplier_id = '0ea01154-99a2-432a-a536-e608e8fa44f9';

-- 2. Deletar perfis vinculados (tabela profiles)
DELETE FROM profiles WHERE supplier_id = '0ea01154-99a2-432a-a536-e608e8fa44f9';

-- 3. Deletar associações com clientes
DELETE FROM client_suppliers WHERE supplier_id = '0ea01154-99a2-432a-a536-e608e8fa44f9';

-- 4. Deletar produtos do fornecedor (se houver)
DELETE FROM products WHERE supplier_id = '0ea01154-99a2-432a-a536-e608e8fa44f9';

-- 5. Deletar respostas a cotações (se houver)
DELETE FROM quote_responses WHERE supplier_id = '0ea01154-99a2-432a-a536-e608e8fa44f9';

-- 6. Finalmente, deletar o fornecedor
DELETE FROM suppliers WHERE id = '0ea01154-99a2-432a-a536-e608e8fa44f9';