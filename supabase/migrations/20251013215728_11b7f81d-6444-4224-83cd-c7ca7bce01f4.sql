-- ========================================
-- CORREÇÃO: Numeração de RFQ por Cliente
-- ========================================

-- Etapa 1: Corrigir counters corrompidos
-- Usar subconsulta para extrair números primeiro, depois aplicar MAX
WITH extracted_numbers AS (
  SELECT 
    client_id,
    (regexp_matches(id, '^RFQ(\d+)$'))[1]::int as rfq_number
  FROM public.quotes
  WHERE id ~ '^RFQ\d+$'
),
max_rfq_per_client AS (
  SELECT 
    client_id,
    COALESCE(MAX(rfq_number), 0) as max_num
  FROM extracted_numbers
  GROUP BY client_id
)
UPDATE public.client_quote_counters c
SET 
  current_counter = m.max_num,
  updated_at = now()
FROM max_rfq_per_client m
WHERE c.client_id = m.client_id
  AND c.current_counter != m.max_num;

-- Etapa 2: Garantir atomicidade na função next_quote_id_by_client
CREATE OR REPLACE FUNCTION public.next_quote_id_by_client(
  p_client_id uuid, 
  prefix text DEFAULT 'RFQ'::text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  n INTEGER;
  code_text TEXT;
BEGIN
  -- INSERT ... ON CONFLICT é atômico e previne race conditions
  INSERT INTO public.client_quote_counters (client_id, current_counter)
  VALUES (p_client_id, 1)
  ON CONFLICT (client_id) 
  DO UPDATE SET 
    current_counter = client_quote_counters.current_counter + 1,
    updated_at = now()
  RETURNING current_counter INTO n;
  
  -- Formatar como RFQ01, RFQ02, ..., RFQ99
  code_text := prefix || lpad(n::text, 2, '0');
  
  RETURN code_text;
END;
$$;

-- Etapa 3: Recriar trigger para garantir comportamento correto
DROP TRIGGER IF EXISTS trg_quotes_set_id ON public.quotes;

CREATE OR REPLACE FUNCTION public.trg_quotes_set_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Só gerar ID se estiver vazio ou null
  IF NEW.id IS NULL OR btrim(NEW.id) = '' THEN
    -- Usar a função que gera ID por cliente
    NEW.id := public.next_quote_id_by_client(NEW.client_id, 'RFQ');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_quotes_set_id
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_quotes_set_id();

-- Etapa 4: Adicionar índice composto para performance
CREATE INDEX IF NOT EXISTS idx_quotes_client_id_id 
ON public.quotes(client_id, id);