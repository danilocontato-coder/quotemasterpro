-- REMOVER TODAS as políticas de suppliers para começar limpo
DROP POLICY IF EXISTS "suppliers_admin_full_access" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_admin_select" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_admin_update" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_admin_delete" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_admin_insert" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_client_insert" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_client_update" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_own_access" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_own_select" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_own_update" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_own_delete" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_associated_clients_select" ON public.suppliers;

-- Recriar políticas limpas e funcionais

-- 1) Admin tem acesso completo
CREATE POLICY "suppliers_admin_all"
ON public.suppliers
FOR ALL
TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

-- 2) Fornecedores podem ver e editar apenas seus próprios dados
CREATE POLICY "suppliers_own_data"
ON public.suppliers
FOR ALL
TO authenticated
USING (id = get_current_user_supplier_id())
WITH CHECK (id = get_current_user_supplier_id());

-- 3) Clientes podem VER fornecedores associados
CREATE POLICY "suppliers_client_view"
ON public.suppliers
FOR SELECT
TO authenticated
USING (
  get_current_user_client_id() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.client_suppliers cs
    WHERE cs.supplier_id = suppliers.id
      AND cs.client_id = get_current_user_client_id()
      AND cs.status = 'active'
  )
);

-- 4) Clientes podem CRIAR fornecedores (trigger vai preencher client_id)
CREATE POLICY "suppliers_client_create"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND get_current_user_client_id() IS NOT NULL
);

-- 5) Clientes podem ATUALIZAR fornecedores que criaram/associaram
CREATE POLICY "suppliers_client_edit"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (
  get_current_user_client_id() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.client_suppliers cs
    WHERE cs.supplier_id = suppliers.id
      AND cs.client_id = get_current_user_client_id()
  )
);