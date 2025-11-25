-- =====================================================
-- Migração: Mover client_id de suppliers para client_suppliers
-- =====================================================
-- 
-- Este script migra a arquitetura de fornecedores de um modelo
-- onde client_id está na tabela suppliers para um modelo onde
-- as associações são gerenciadas pela tabela client_suppliers.
--
-- IMPORTANTE: Execute este script apenas UMA VEZ e em um ambiente
-- de manutenção, pois ele modifica dados e estrutura de tabelas.
-- =====================================================

-- 1. Criar registros em client_suppliers para todos os suppliers com client_id
INSERT INTO client_suppliers (client_id, supplier_id, status, associated_at, created_at, updated_at)
SELECT 
  s.client_id,
  s.id as supplier_id,
  'active' as status,
  NOW() as associated_at,
  NOW() as created_at,
  NOW() as updated_at
FROM suppliers s
WHERE s.client_id IS NOT NULL
ON CONFLICT (client_id, supplier_id) DO NOTHING;

-- 2. Verificar quantos registros foram criados
SELECT 
  COUNT(*) as total_associations_created,
  (SELECT COUNT(*) FROM suppliers WHERE client_id IS NOT NULL) as suppliers_with_client_id
FROM client_suppliers
WHERE created_at >= NOW() - INTERVAL '5 minutes';

-- 3. Limpar client_id da tabela suppliers (tornar coluna obsoleta)
-- ATENÇÃO: Descomente a linha abaixo apenas DEPOIS de verificar que step 1 funcionou
-- UPDATE suppliers SET client_id = NULL WHERE client_id IS NOT NULL;

-- 4. Verificar integridade após migração
SELECT 
  'Suppliers sem client_id' as status,
  COUNT(*) as count
FROM suppliers
WHERE client_id IS NOT NULL

UNION ALL

SELECT 
  'Associações em client_suppliers' as status,
  COUNT(*) as count
FROM client_suppliers;

-- 5. Listar fornecedores com múltiplas associações (esperado após migração)
SELECT 
  s.name,
  s.cnpj,
  COUNT(DISTINCT cs.client_id) as num_clients,
  STRING_AGG(DISTINCT c.name, ', ') as client_names
FROM suppliers s
JOIN client_suppliers cs ON cs.supplier_id = s.id
JOIN clients c ON c.id = cs.client_id
GROUP BY s.id, s.name, s.cnpj
HAVING COUNT(DISTINCT cs.client_id) > 1
ORDER BY num_clients DESC;

-- =====================================================
-- Pós-Migração: Atualizar RLS Policies
-- =====================================================
-- 
-- Após executar esta migração, você DEVE atualizar as políticas RLS
-- da tabela suppliers para usar client_suppliers em vez de client_id.
--
-- Exemplo de política atualizada:
--
-- CREATE POLICY "suppliers_client_view_associated" ON suppliers
-- FOR SELECT
-- USING (
--   EXISTS (
--     SELECT 1 FROM client_suppliers cs
--     WHERE cs.supplier_id = suppliers.id
--     AND cs.client_id = get_current_user_client_id()
--     AND cs.status = 'active'
--   )
-- );
-- =====================================================

-- 6. Script para reverter migração (em caso de emergência)
-- ATENÇÃO: Use apenas se algo der errado!
/*
-- Reverter: restaurar client_id na tabela suppliers
UPDATE suppliers s
SET client_id = (
  SELECT cs.client_id
  FROM client_suppliers cs
  WHERE cs.supplier_id = s.id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM client_suppliers cs
  WHERE cs.supplier_id = s.id
);

-- Deletar associações criadas pela migração
DELETE FROM client_suppliers
WHERE created_at >= '[DATA_DA_MIGRACAO]';
*/
