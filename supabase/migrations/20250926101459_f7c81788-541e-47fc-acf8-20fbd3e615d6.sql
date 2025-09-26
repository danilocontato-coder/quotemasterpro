-- LIMPEZA COMPLETA E CORREÇÃO - Isolamento total produtos

-- 1. Remover TODAS as políticas existentes (uma por uma)
DROP POLICY IF EXISTS "products_delete" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_isolated_access" ON public.products;
DROP POLICY IF EXISTS "products_select_isolated" ON public.products;
DROP POLICY IF EXISTS "products_supplier_delete" ON public.products;
DROP POLICY IF EXISTS "products_supplier_insert" ON public.products;
DROP POLICY IF EXISTS "products_supplier_update" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;

-- 2. Criar políticas com isolamento total - NOVO NOME
CREATE POLICY "products_total_isolation_select" 
ON public.products 
FOR SELECT 
USING (
  (get_user_role() = 'admin'::text) OR 
  -- Fornecedores: apenas seus produtos (com supplier_id definido)
  (supplier_id IS NOT NULL AND supplier_id = get_current_user_supplier_id()) OR
  -- Clientes: apenas produtos internos (sem supplier_id, apenas client_id)
  (
    get_user_role() IN ('client', 'manager', 'collaborator') AND
    client_id = get_current_user_client_id() AND
    supplier_id IS NULL
  )
);

CREATE POLICY "products_total_isolation_insert" 
ON public.products 
FOR INSERT 
WITH CHECK (
  (get_user_role() = 'admin'::text) OR 
  -- Fornecedores: criar com supplier_id (sem client_id)
  (supplier_id = get_current_user_supplier_id() AND client_id IS NULL) OR
  -- Clientes: criar sem supplier_id (apenas client_id)
  (
    get_user_role() IN ('client', 'manager', 'collaborator') AND
    client_id = get_current_user_client_id() AND
    supplier_id IS NULL
  )
);

CREATE POLICY "products_total_isolation_update" 
ON public.products 
FOR UPDATE 
USING (
  (get_user_role() = 'admin'::text) OR 
  (supplier_id IS NOT NULL AND supplier_id = get_current_user_supplier_id()) OR
  (
    get_user_role() IN ('client', 'manager', 'collaborator') AND
    client_id = get_current_user_client_id() AND
    supplier_id IS NULL
  )
);

CREATE POLICY "products_total_isolation_delete" 
ON public.products 
FOR DELETE 
USING (
  (get_user_role() = 'admin'::text) OR 
  (supplier_id IS NOT NULL AND supplier_id = get_current_user_supplier_id()) OR
  (
    get_user_role() IN ('client', 'manager', 'collaborator') AND
    client_id = get_current_user_client_id() AND
    supplier_id IS NULL
  )
);