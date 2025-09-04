-- Sequência global para código de produtos
DO $$ BEGIN
  CREATE SEQUENCE IF NOT EXISTS public.product_code_seq;
EXCEPTION WHEN others THEN NULL; END $$;

-- Função para montar código com prefixo e número sequencial
CREATE OR REPLACE FUNCTION public.next_product_code(prefix text DEFAULT 'PROD')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
  code_text text;
BEGIN
  n := nextval('public.product_code_seq');
  code_text := prefix || lpad(n::text, 4, '0');
  RETURN code_text;
END;
$$;

-- Definir default do campo code para usar a função acima
ALTER TABLE public.products ALTER COLUMN code SET DEFAULT public.next_product_code('PROD');