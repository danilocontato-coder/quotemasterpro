-- CORREÇÃO CRÍTICA - Etapa 6: Tratar fornecedor órfão com produtos

-- 1. Verificar qual cliente possui o produto do fornecedor órfão e associar
UPDATE public.suppliers 
SET client_id = (
  SELECT p.client_id 
  FROM public.products p 
  WHERE p.supplier_id = suppliers.id 
  LIMIT 1
)
WHERE client_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.products WHERE supplier_id = suppliers.id
  );

-- 2. Para fornecedores sem client_id e sem produtos, marcar como inativos
UPDATE public.suppliers 
SET status = 'inactive'
WHERE client_id IS NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.products WHERE supplier_id = suppliers.id
  );

-- 3. Verificação final: garantir que todos os produtos têm client_id consistente com seu fornecedor
UPDATE public.products 
SET client_id = s.client_id
FROM public.suppliers s
WHERE products.supplier_id = s.id 
  AND s.client_id IS NOT NULL
  AND (products.client_id IS NULL OR products.client_id != s.client_id);

-- 4. Adicionar índices para performance das consultas RLS
CREATE INDEX IF NOT EXISTS idx_products_client_supplier ON public.products(client_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_client ON public.suppliers(client_id) WHERE client_id IS NOT NULL;