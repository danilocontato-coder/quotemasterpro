-- CORREÇÃO CRÍTICA - Etapa 5: Tratar fornecedores globais sem client_id

-- Para fornecedores sem client_id que têm produtos, criar política especial
-- Para fornecedores certificados globais, manter visibilidade controlada

-- 1. Atualizar política de suppliers para incluir fornecedores certificados globais de forma controlada
DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;

CREATE POLICY "suppliers_select" 
ON public.suppliers 
FOR SELECT 
USING (
  (get_user_role() = 'admin'::text) OR 
  (id = get_current_user_supplier_id()) OR
  -- Clientes podem ver fornecedores do SEU cliente
  (client_id = get_current_user_client_id()) OR
  -- Fornecedores certificados sem client_id são visíveis apenas quando status = certified
  (client_id IS NULL AND type = 'certified' AND status = 'active')
);

-- 2. Atualizar política de produtos para incluir produtos de fornecedores certificados globais
DROP POLICY IF EXISTS "products_supplier_select" ON public.products;

CREATE POLICY "products_supplier_select" 
ON public.products 
FOR SELECT 
USING (
  (supplier_id = get_current_user_supplier_id()) OR 
  (get_user_role() = 'admin'::text) OR
  -- Clientes podem ver produtos de fornecedores do SEU cliente
  (
    get_user_role() IN ('client', 'manager', 'collaborator') AND
    supplier_id IN (
      SELECT s.id 
      FROM suppliers s 
      WHERE s.client_id = get_current_user_client_id()
        OR (s.client_id IS NULL AND s.type = 'certified' AND s.status = 'active')
    )
  )
);

-- 3. Marcar fornecedores sem client_id e sem produtos como inativos (limpar dados)
UPDATE public.suppliers 
SET status = 'inactive'
WHERE client_id IS NULL 
  AND type != 'certified'
  AND NOT EXISTS (
    SELECT 1 FROM public.products WHERE supplier_id = suppliers.id
  );