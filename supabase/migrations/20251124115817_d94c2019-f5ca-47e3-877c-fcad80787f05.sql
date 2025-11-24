-- Remover política antiga que não permite fornecedores
DROP POLICY IF EXISTS "clients_own_select" ON public.clients;

-- Criar nova política que permite fornecedores lerem dados de clientes
-- quando existe uma relação através de cotações
CREATE POLICY "suppliers_read_client_from_quotes"
ON public.clients
FOR SELECT
TO public
USING (
  -- Admins têm acesso total
  get_user_role() = 'admin'::text
  OR
  -- Cliente pode ver seus próprios dados
  id = get_current_user_client_id()
  OR
  -- Fornecedor pode ver dados de clientes com os quais tem cotações
  (
    get_user_role() = 'supplier'::text
    AND EXISTS (
      SELECT 1 
      FROM quotes q
      INNER JOIN quote_suppliers qs ON qs.quote_id = q.id
      WHERE q.client_id = clients.id
      AND qs.supplier_id = get_current_user_supplier_id()
    )
  )
);