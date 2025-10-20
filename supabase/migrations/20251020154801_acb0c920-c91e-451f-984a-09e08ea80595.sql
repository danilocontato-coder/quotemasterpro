-- Limpar políticas duplicadas e corrigir isolamento de produtos
-- Remove políticas antigas
DROP POLICY IF EXISTS "products_select_isolated" ON public.products;
DROP POLICY IF EXISTS "products_insert_isolated" ON public.products;
DROP POLICY IF EXISTS "products_update_isolated" ON public.products;
DROP POLICY IF EXISTS "products_delete_isolated" ON public.products;

-- Manter apenas as políticas corretas de isolamento total
-- As políticas products_total_isolation_* já estão corretas e fazem:
-- 1. Admins podem ver tudo
-- 2. Fornecedores veem apenas seus produtos (supplier_id = get_current_user_supplier_id())
-- 3. Clientes/Managers veem apenas produtos do seu cliente (client_id = get_current_user_client_id() AND supplier_id IS NULL)

-- Adicionar índices para melhor performance nas consultas com filtros de isolamento
CREATE INDEX IF NOT EXISTS idx_products_client_id ON public.products(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON public.products(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_isolation ON public.products(client_id, supplier_id);