-- Reverter dados inconsistentes: um produto não pode pertencer a cliente e fornecedor ao mesmo tempo
UPDATE public.products
SET supplier_id = NULL
WHERE client_id IS NOT NULL AND supplier_id IS NOT NULL;

-- Garantir exclusividade entre client_id e supplier_id (XOR)
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_one_owner_chk;
ALTER TABLE public.products
ADD CONSTRAINT products_one_owner_chk
CHECK ((client_id IS NOT NULL) <> (supplier_id IS NOT NULL));