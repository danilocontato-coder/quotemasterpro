-- 1. Adicionar coluna local_code para entregas
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS local_code TEXT;

-- 2. Criar tabela de contadores para entregas por cliente
CREATE TABLE IF NOT EXISTS public.client_delivery_counters (
  client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  current_counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Criar função para gerar próximo ID de entrega por cliente
CREATE OR REPLACE FUNCTION public.next_delivery_id_by_client(p_client_id UUID, prefix TEXT DEFAULT 'ENT')
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
  INSERT INTO public.client_delivery_counters (client_id, current_counter)
  VALUES (p_client_id, 1)
  ON CONFLICT (client_id) 
  DO UPDATE SET 
    current_counter = client_delivery_counters.current_counter + 1,
    updated_at = now()
  RETURNING current_counter INTO n;
  
  -- Formatar como ENT001, ENT002, etc (3 dígitos)
  code_text := prefix || lpad(n::text, 3, '0');
  RETURN code_text;
END;
$$;

-- 4. Criar trigger para gerar local_code automaticamente
CREATE OR REPLACE FUNCTION public.trg_deliveries_set_local_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só gerar local_code se estiver vazio ou null
  IF NEW.local_code IS NULL OR BTRIM(NEW.local_code) = '' THEN
    NEW.local_code := public.next_delivery_id_by_client(NEW.client_id, 'ENT');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deliveries_set_local_code ON deliveries;
CREATE TRIGGER trg_deliveries_set_local_code
BEFORE INSERT ON deliveries
FOR EACH ROW
EXECUTE FUNCTION public.trg_deliveries_set_local_code();

-- 5. Popular local_code para entregas existentes
DO $$
DECLARE
  delivery_rec RECORD;
  new_code TEXT;
BEGIN
  FOR delivery_rec IN 
    SELECT id, client_id 
    FROM deliveries 
    WHERE local_code IS NULL OR local_code = ''
    ORDER BY created_at ASC
  LOOP
    new_code := public.next_delivery_id_by_client(delivery_rec.client_id, 'ENT');
    UPDATE deliveries 
    SET local_code = new_code 
    WHERE id = delivery_rec.id;
  END LOOP;
END $$;

-- 6. Adicionar RLS policies para client_delivery_counters
ALTER TABLE public.client_delivery_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_delivery_counters_select"
ON public.client_delivery_counters
FOR SELECT
USING (
  (get_user_role() = 'admin') OR
  (client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()))
);

CREATE POLICY "client_delivery_counters_insert"
ON public.client_delivery_counters
FOR INSERT
WITH CHECK (
  (get_user_role() = 'admin') OR
  (client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()))
);

CREATE POLICY "client_delivery_counters_update"
ON public.client_delivery_counters
FOR UPDATE
USING (
  (get_user_role() = 'admin') OR
  (client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()))
);