-- Safely remove the 3 test suppliers by first clearing dependencies
WITH target_suppliers AS (
  SELECT id FROM public.suppliers
  WHERE name IN ('Alpha Materiais de Construção','Beta Limpeza Profissional','Gamma Jardinagem')
     OR cnpj IN ('22.333.444/0001-55','33.444.555/0001-66','44.555.666/0001-77')
)
-- Detach references from profiles
UPDATE public.profiles
SET supplier_id = NULL
WHERE supplier_id IN (SELECT id FROM target_suppliers);

-- Detach references from users (if any)
UPDATE public.users
SET supplier_id = NULL
WHERE supplier_id IN (SELECT id FROM target_suppliers);

-- Optionally detach quotes/quote_responses to avoid dangling references
UPDATE public.quotes
SET supplier_id = NULL
WHERE supplier_id IN (SELECT id FROM target_suppliers);

UPDATE public.quote_responses
SET supplier_id = NULL
WHERE supplier_id IN (SELECT id FROM target_suppliers);

-- Finally delete suppliers
DELETE FROM public.suppliers
WHERE id IN (SELECT id FROM target_suppliers);