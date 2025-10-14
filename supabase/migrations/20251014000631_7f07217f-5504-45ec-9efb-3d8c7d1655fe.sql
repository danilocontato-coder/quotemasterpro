-- Corrigir numeração de produtos para ser por cliente (similar às cotações)
-- Esta migration restaura o comportamento correto que foi sobrescrito

-- Remover trigger antigo que usa numeração global
DROP TRIGGER IF EXISTS trg_products_set_code_before_insert ON public.products;

-- Recriar trigger para usar numeração por cliente
CREATE OR REPLACE FUNCTION public.trg_products_set_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só gerar código se estiver vazio ou null E houver client_id
  IF (NEW.code IS NULL OR btrim(NEW.code) = '') AND NEW.client_id IS NOT NULL THEN
    -- Usar função que gera códigos sequenciais POR CLIENTE (já existe)
    NEW.code := public.next_product_id_by_client(NEW.client_id, 'PROD');
  ELSIF (NEW.code IS NULL OR btrim(NEW.code) = '') AND NEW.client_id IS NULL THEN
    -- Se não houver client_id, gerar código temporário (será atualizado quando client_id for definido)
    NEW.code := 'TEMP-' || gen_random_uuid()::text;
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger BEFORE INSERT
CREATE TRIGGER trg_products_set_code_before_insert
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_products_set_code();

-- Comentário explicativo
COMMENT ON FUNCTION public.trg_products_set_code() IS 
  'Gera código sequencial de produto POR CLIENTE (PROD001, PROD002...) usando next_product_id_by_client. Garante que cada cliente tenha sua própria numeração independente, similar ao sistema de cotações.';