-- CORREÇÃO CRÍTICA - Etapa 3: Remover constraint e limpar dados órfãos

-- 1. Primeiro, remover a constraint problemática
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_one_owner_chk;

-- 2. Setar client_id como NULL para produtos órfãos que têm client_id e supplier_id NULL
UPDATE public.products 
SET client_id = NULL 
WHERE supplier_id IS NULL;

-- 3. Para cada cliente, criar um fornecedor genérico
INSERT INTO public.suppliers (name, cnpj, email, client_id, status, type)
SELECT 
  'Fornecedor Genérico - ' || c.name,
  '00000000000' || LPAD(row_number() OVER ()::text, 3, '0'),
  'generico' || c.id::text || '@sistema.com',
  c.id,
  'active',
  'local'
FROM (
  SELECT DISTINCT c.id, c.name 
  FROM public.clients c
  WHERE EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.client_id IS NULL AND p.supplier_id IS NULL
  )
) c;

-- 4. Associar produtos órfãos ao primeiro fornecedor genérico
UPDATE public.products 
SET supplier_id = (
  SELECT s.id 
  FROM public.suppliers s 
  WHERE s.name LIKE 'Fornecedor Genérico%'
  LIMIT 1
)
WHERE supplier_id IS NULL;