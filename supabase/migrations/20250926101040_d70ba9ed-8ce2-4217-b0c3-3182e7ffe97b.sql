-- CORREÇÃO FINAL - Limpeza total e isolamento garantido

-- 1. Identificar e corrigir produto órfão restante
UPDATE public.products 
SET client_id = s.client_id
FROM public.suppliers s
WHERE products.supplier_id = s.id 
  AND products.client_id IS NULL;

-- 2. Para fornecedores órfãos ativos restantes, desativar definitivamente
UPDATE public.suppliers 
SET status = 'inactive'
WHERE client_id IS NULL 
  AND type != 'certified';

-- 3. Garantir que apenas fornecedores certificados globais permaneçam sem client_id
UPDATE public.suppliers 
SET type = 'certified'
WHERE client_id IS NULL 
  AND status = 'active';

-- 4. POLÍTICA RLS FINAL RESTRITIVA - Isolamento total por cliente
DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;

CREATE POLICY "suppliers_select" 
ON public.suppliers 
FOR SELECT 
USING (
  (get_user_role() = 'admin'::text) OR 
  (id = get_current_user_supplier_id()) OR
  -- ISOLAMENTO TOTAL: clientes só veem fornecedores do SEU cliente
  (client_id = get_current_user_client_id())
);

DROP POLICY IF EXISTS "products_supplier_select" ON public.products;

CREATE POLICY "products_supplier_select" 
ON public.products 
FOR SELECT 
USING (
  (supplier_id = get_current_user_supplier_id()) OR 
  (get_user_role() = 'admin'::text) OR
  -- ISOLAMENTO TOTAL: clientes só veem produtos de fornecedores do SEU cliente
  (
    get_user_role() IN ('client', 'manager', 'collaborator') AND
    supplier_id IN (
      SELECT s.id 
      FROM suppliers s 
      WHERE s.client_id = get_current_user_client_id()
    )
  )
);