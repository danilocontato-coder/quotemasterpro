-- ========================================
-- CORREÇÃO CRÍTICA: Vazamento Multi-Tenant em quotes
-- Data: 2025-01-20
-- Issue: va@va.com.br vendo 50 cotações (20 de outros clientes)
-- ========================================

-- 1) DROPAR policies problemáticas que permitem vazamento
DROP POLICY IF EXISTS quotes_select_policy ON quotes;
DROP POLICY IF EXISTS condominios_view_own_quotes ON quotes;
DROP POLICY IF EXISTS administradora_view_condominio_quotes ON quotes;

-- 2) CRIAR policies específicas e restritivas por papel

-- Policy 1: Clientes/Managers APENAS suas próprias cotações
CREATE POLICY quotes_client_view ON quotes
FOR SELECT TO authenticated
USING (
  user_has_module_access('quotes') 
  AND get_user_role() IN ('client', 'manager', 'collaborator', 'admin_cliente')
  AND client_id = get_current_user_client_id()
);

-- Policy 2: Fornecedores APENAS cotações explicitamente atribuídas
CREATE POLICY quotes_supplier_view ON quotes
FOR SELECT TO authenticated
USING (
  get_user_role() = 'supplier'
  AND current_user_can_see_quote(id)
);

-- Policy 3: Administradoras veem suas cotações + cotações de condomínios filhos
CREATE POLICY quotes_administradora_view ON quotes
FOR SELECT TO authenticated
USING (
  user_has_module_access('quotes')
  AND get_user_role() IN ('admin_cliente', 'manager')
  AND (
    on_behalf_of_client_id = get_current_user_client_id()
    OR client_id IN (
      SELECT id FROM clients
      WHERE parent_client_id = get_current_user_client_id()
    )
  )
);

-- Policy 4: Admin global vê tudo
CREATE POLICY quotes_admin_view ON quotes
FOR SELECT TO authenticated
USING (
  get_user_role() = 'admin'
);

-- 3) MANTER policies de INSERT/UPDATE/DELETE inalteradas
-- (Essas já estão corretas com verificações adequadas)

-- 4) Adicionar índices para performance das novas policies
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_on_behalf_of_client_id ON quotes(on_behalf_of_client_id);

-- 5) Comentários para documentação
COMMENT ON POLICY quotes_client_view ON quotes IS 'Clientes veem APENAS suas próprias cotações (isolamento multi-tenant)';
COMMENT ON POLICY quotes_supplier_view ON quotes IS 'Fornecedores veem APENAS cotações explicitamente atribuídas via current_user_can_see_quote()';
COMMENT ON POLICY quotes_administradora_view ON quotes IS 'Administradoras veem suas cotações + cotações de condomínios filhos';
COMMENT ON POLICY quotes_admin_view ON quotes IS 'Admin global tem acesso total ao sistema';