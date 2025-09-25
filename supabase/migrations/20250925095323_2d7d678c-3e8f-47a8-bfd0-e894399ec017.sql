-- Ajustar política RLS para permitir que usuários de fornecedores vejam seus próprios dados
-- Substituir a política existente para incluir usuários vinculados ao fornecedor

DROP POLICY IF EXISTS suppliers_select ON public.suppliers;

CREATE POLICY "suppliers_select" ON public.suppliers
FOR SELECT USING (
  -- Admin pode ver todos
  (get_user_role() = 'admin'::text) OR 
  -- Fornecedor pode ver seus próprios dados (usuários vinculados ao supplier_id)
  (id = get_current_user_supplier_id()) OR 
  -- Usuários de clientes podem ver fornecedores ativos (para busca/cotações)
  ((status = 'active'::text) AND (get_user_role() <> 'supplier'::text))
);