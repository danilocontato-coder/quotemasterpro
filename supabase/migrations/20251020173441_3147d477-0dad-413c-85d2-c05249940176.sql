-- ========================================
-- CORREÇÃO MULTI-TENANT: Products e Quote Items
-- Data: 2025-01-20
-- Issue: Isolamento de produtos e itens de cotação
-- ========================================

-- 1) DROPAR policies existentes problemáticas em products
DROP POLICY IF EXISTS products_select_policy ON products;
DROP POLICY IF EXISTS products_insert_policy ON products;
DROP POLICY IF EXISTS products_update_policy ON products;
DROP POLICY IF EXISTS products_delete_policy ON products;

-- 2) CRIAR policies RLS restritivas para products

-- SELECT: Clientes veem apenas seus produtos
CREATE POLICY products_client_view ON products
FOR SELECT TO authenticated
USING (
  get_user_role() IN ('client', 'manager', 'collaborator', 'admin_cliente')
  AND client_id = get_current_user_client_id()
);

-- SELECT: Fornecedores veem apenas seus produtos
CREATE POLICY products_supplier_view ON products
FOR SELECT TO authenticated
USING (
  get_user_role() = 'supplier'
  AND supplier_id = get_current_user_supplier_id()
);

-- SELECT: Admin vê tudo
CREATE POLICY products_admin_view ON products
FOR SELECT TO authenticated
USING (
  get_user_role() = 'admin'
);

-- INSERT: Clientes podem criar produtos associados ao seu client_id
CREATE POLICY products_client_insert ON products
FOR INSERT TO authenticated
WITH CHECK (
  get_user_role() IN ('client', 'manager', 'collaborator', 'admin_cliente')
  AND client_id = get_current_user_client_id()
);

-- INSERT: Fornecedores podem criar produtos associados ao seu supplier_id
CREATE POLICY products_supplier_insert ON products
FOR INSERT TO authenticated
WITH CHECK (
  get_user_role() = 'supplier'
  AND supplier_id = get_current_user_supplier_id()
);

-- INSERT: Admin pode criar qualquer produto
CREATE POLICY products_admin_insert ON products
FOR INSERT TO authenticated
WITH CHECK (
  get_user_role() = 'admin'
);

-- UPDATE: Clientes atualizam apenas seus produtos
CREATE POLICY products_client_update ON products
FOR UPDATE TO authenticated
USING (
  get_user_role() IN ('client', 'manager', 'collaborator', 'admin_cliente')
  AND client_id = get_current_user_client_id()
);

-- UPDATE: Fornecedores atualizam apenas seus produtos
CREATE POLICY products_supplier_update ON products
FOR UPDATE TO authenticated
USING (
  get_user_role() = 'supplier'
  AND supplier_id = get_current_user_supplier_id()
);

-- UPDATE: Admin atualiza qualquer produto
CREATE POLICY products_admin_update ON products
FOR UPDATE TO authenticated
USING (
  get_user_role() = 'admin'
);

-- DELETE: Clientes deletam apenas seus produtos
CREATE POLICY products_client_delete ON products
FOR DELETE TO authenticated
USING (
  get_user_role() IN ('client', 'manager', 'collaborator', 'admin_cliente')
  AND client_id = get_current_user_client_id()
);

-- DELETE: Fornecedores deletam apenas seus produtos
CREATE POLICY products_supplier_delete ON products
FOR DELETE TO authenticated
USING (
  get_user_role() = 'supplier'
  AND supplier_id = get_current_user_supplier_id()
);

-- DELETE: Admin deleta qualquer produto
CREATE POLICY products_admin_delete ON products
FOR DELETE TO authenticated
USING (
  get_user_role() = 'admin'
);

-- 3) DROPAR policies existentes em quote_items
DROP POLICY IF EXISTS quote_items_select_policy ON quote_items;

-- 4) CRIAR policies RLS para quote_items

-- SELECT: Usuários veem apenas itens de cotações que eles podem ver
CREATE POLICY quote_items_client_view ON quote_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM quotes q
    WHERE q.id = quote_items.quote_id
    AND q.client_id = get_current_user_client_id()
  )
  AND get_user_role() IN ('client', 'manager', 'collaborator', 'admin_cliente')
);

-- SELECT: Fornecedores veem itens de cotações atribuídas
CREATE POLICY quote_items_supplier_view ON quote_items
FOR SELECT TO authenticated
USING (
  get_user_role() = 'supplier'
  AND EXISTS (
    SELECT 1 FROM quotes q
    WHERE q.id = quote_items.quote_id
    AND current_user_can_see_quote(q.id)
  )
);

-- SELECT: Admin vê todos os itens
CREATE POLICY quote_items_admin_view ON quote_items
FOR SELECT TO authenticated
USING (
  get_user_role() = 'admin'
);

-- 5) Índices para performance
CREATE INDEX IF NOT EXISTS idx_products_client_id ON products(client_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);

-- 6) Comentários
COMMENT ON POLICY products_client_view ON products IS 'Clientes veem apenas seus próprios produtos';
COMMENT ON POLICY products_supplier_view ON products IS 'Fornecedores veem apenas seus próprios produtos';
COMMENT ON POLICY quote_items_client_view ON quote_items IS 'Clientes veem itens apenas de suas cotações';
COMMENT ON POLICY quote_items_supplier_view ON quote_items IS 'Fornecedores veem itens de cotações atribuídas';