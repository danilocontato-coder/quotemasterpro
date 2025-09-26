-- Adicionar política INSERT para permitir que clientes criem fornecedores
CREATE POLICY "suppliers_client_insert" 
ON public.suppliers 
FOR INSERT 
TO authenticated 
WITH CHECK (
  -- Admins podem inserir qualquer fornecedor
  get_user_role() = 'admin' 
  OR 
  -- Clientes podem criar fornecedores (serão associados depois)
  (
    auth.uid() IS NOT NULL 
    AND get_current_user_client_id() IS NOT NULL
  )
);

-- Adicionar política UPDATE para clientes poderem editar fornecedores que criaram
CREATE POLICY "suppliers_client_update" 
ON public.suppliers 
FOR UPDATE 
TO authenticated 
USING (
  get_user_role() = 'admin' 
  OR 
  id = get_current_user_supplier_id()
  OR
  -- Clientes podem atualizar fornecedores que estão associados a eles
  (
    get_current_user_client_id() IS NOT NULL 
    AND id IN (
      SELECT cs.supplier_id 
      FROM client_suppliers cs 
      WHERE cs.client_id = get_current_user_client_id()
    )
  )
)
WITH CHECK (
  get_user_role() = 'admin' 
  OR 
  id = get_current_user_supplier_id()
  OR
  (
    get_current_user_client_id() IS NOT NULL 
    AND id IN (
      SELECT cs.supplier_id 
      FROM client_suppliers cs 
      WHERE cs.client_id = get_current_user_client_id()
    )
  )
);