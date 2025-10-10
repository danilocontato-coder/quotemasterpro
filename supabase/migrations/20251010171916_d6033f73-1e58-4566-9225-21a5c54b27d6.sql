-- Criar trigger para gerar código de produto automaticamente
-- Similar ao trigger de quotes (trg_quotes_set_id)

CREATE OR REPLACE FUNCTION public.trg_products_set_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só gerar código se estiver vazio ou null
  IF NEW.code IS NULL OR btrim(NEW.code) = '' THEN
    -- Usar a função que gera códigos sequenciais por cliente
    NEW.code := public.next_product_code('PROD');
  END IF;
  RETURN NEW;
END;
$$;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trg_products_set_code_before_insert ON public.products;

-- Criar trigger que executa ANTES do INSERT
CREATE TRIGGER trg_products_set_code_before_insert
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.trg_products_set_code();