-- CORREÇÃO CRÍTICA - Isolamento total entre produtos de clientes e fornecedores

-- 1. Remover política que permitia clientes verem produtos de fornecedores
DROP POLICY IF EXISTS "products_supplier_select" ON public.products;

-- 2. Criar política restritiva: cada um vê apenas seus próprios produtos
CREATE POLICY "products_isolated_access" 
ON public.products 
FOR SELECT 
USING (
  (get_user_role() = 'admin'::text) OR 
  -- Fornecedores só veem seus próprios produtos
  (supplier_id = get_current_user_supplier_id()) OR
  -- Clientes só veem produtos do SEU cliente (controle interno)
  (
    get_user_role() IN ('client', 'manager', 'collaborator') AND
    client_id = get_current_user_client_id() AND
    supplier_id IS NULL -- Produtos internos do cliente não têm supplier_id
  )
);

-- 3. Política de inserção isolada
DROP POLICY IF EXISTS "products_insert" ON public.products;

CREATE POLICY "products_insert" 
ON public.products 
FOR INSERT 
WITH CHECK (
  (get_user_role() = 'admin'::text) OR 
  -- Fornecedores criam produtos com seu supplier_id
  (supplier_id = get_current_user_supplier_id()) OR
  -- Clientes criam produtos internos (sem supplier_id)
  (
    get_user_role() IN ('client', 'manager', 'collaborator') AND
    client_id = get_current_user_client_id() AND
    supplier_id IS NULL
  )
);

-- 4. Política de atualização isolada
DROP POLICY IF EXISTS "products_update" ON public.products;

CREATE POLICY "products_update" 
ON public.products 
FOR UPDATE 
USING (
  (get_user_role() = 'admin'::text) OR 
  (supplier_id = get_current_user_supplier_id()) OR
  (
    get_user_role() IN ('client', 'manager', 'collaborator') AND
    client_id = get_current_user_client_id() AND
    supplier_id IS NULL
  )
);

-- 5. Política de exclusão isolada
DROP POLICY IF EXISTS "products_delete" ON public.products;

CREATE POLICY "products_delete" 
ON public.products 
FOR DELETE 
USING (
  (get_user_role() = 'admin'::text) OR 
  (supplier_id = get_current_user_supplier_id()) OR
  (
    get_user_role() IN ('client', 'manager', 'collaborator') AND
    client_id = get_current_user_client_id() AND
    supplier_id IS NULL
  )
);