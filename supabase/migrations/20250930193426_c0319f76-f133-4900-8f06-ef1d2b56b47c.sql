-- Criar tabela de contadores de produtos por cliente
CREATE TABLE IF NOT EXISTS public.client_product_counters (
  client_id UUID NOT NULL PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  current_counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.client_product_counters ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para client_product_counters
CREATE POLICY "client_product_counters_select"
ON public.client_product_counters FOR SELECT
USING (
  get_user_role() = 'admin' OR
  client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "client_product_counters_insert"
ON public.client_product_counters FOR INSERT
WITH CHECK (
  get_user_role() = 'admin' OR
  client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "client_product_counters_update"
ON public.client_product_counters FOR UPDATE
USING (
  get_user_role() = 'admin' OR
  client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid())
);

-- Criar função para gerar próximo código de produto por cliente
CREATE OR REPLACE FUNCTION public.next_product_id_by_client(
  p_client_id UUID,
  prefix TEXT DEFAULT 'PROD'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
  code_text TEXT;
BEGIN
  -- Inserir ou atualizar contador do cliente
  INSERT INTO public.client_product_counters (client_id, current_counter)
  VALUES (p_client_id, 1)
  ON CONFLICT (client_id) 
  DO UPDATE SET 
    current_counter = client_product_counters.current_counter + 1,
    updated_at = now()
  RETURNING current_counter INTO n;
  
  -- Formatar como PROD001 (3 dígitos)
  code_text := prefix || lpad(n::text, 3, '0');
  RETURN code_text;
END;
$$;

-- Criar trigger para gerar código automaticamente ao inserir produto
CREATE OR REPLACE FUNCTION public.trg_products_set_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só gerar código se estiver vazio ou null E houver client_id
  IF (NEW.code IS NULL OR btrim(NEW.code) = '') AND NEW.client_id IS NOT NULL THEN
    NEW.code := public.next_product_id_by_client(NEW.client_id, 'PROD');
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger BEFORE INSERT
DROP TRIGGER IF EXISTS products_set_code_trigger ON public.products;
CREATE TRIGGER products_set_code_trigger
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_products_set_code();

-- Atualizar produtos existentes sem código sequencial
DO $$
DECLARE
  product_rec RECORD;
  new_code TEXT;
BEGIN
  FOR product_rec IN 
    SELECT id, client_id, code 
    FROM public.products 
    WHERE client_id IS NOT NULL 
    AND (code IS NULL OR code = '' OR length(code) > 8)
    ORDER BY created_at
  LOOP
    new_code := public.next_product_id_by_client(product_rec.client_id, 'PROD');
    UPDATE public.products 
    SET code = new_code 
    WHERE id = product_rec.id;
  END LOOP;
END $$;