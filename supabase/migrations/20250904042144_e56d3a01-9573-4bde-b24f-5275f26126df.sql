-- Robust migration to sequentialize and auto-generate RFQ IDs
-- Wrap in a transaction-safe script using temp table mapping

-- 1) Ensure sequence exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'quote_id_seq') THEN
    CREATE SEQUENCE public.quote_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
  END IF;
END$$;

-- 2) Create helper function and trigger
CREATE OR REPLACE FUNCTION public.next_quote_id(prefix text DEFAULT 'RFQ')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
  num_text text;
BEGIN
  n := nextval('public.quote_id_seq');
  num_text := lpad(n::text, 2, '0');
  RETURN prefix || num_text;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_quotes_set_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS NULL OR btrim(NEW.id) = '' THEN
    NEW.id := public.next_quote_id('RFQ');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quotes_set_id_before_insert ON public.quotes;
CREATE TRIGGER quotes_set_id_before_insert
BEFORE INSERT ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.trg_quotes_set_id();

-- 3) Ensure unique index on quotes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_quotes_id'
  ) THEN
    CREATE UNIQUE INDEX uq_quotes_id ON public.quotes (id);
  END IF;
END$$;

-- 4) Build mapping of old->new IDs in a temp table
CREATE TEMP TABLE tmp_quote_id_map AS
SELECT id AS old_id,
       'RFQ' || lpad(ROW_NUMBER() OVER (ORDER BY created_at, id)::text, 2, '0') AS new_id
FROM public.quotes;

-- 5) Update quotes using the mapping
UPDATE public.quotes q
SET id = m.new_id
FROM tmp_quote_id_map m
WHERE q.id = m.old_id;

-- 6) Update referencing tables
UPDATE public.quote_items qi
SET quote_id = m.new_id
FROM tmp_quote_id_map m
WHERE qi.quote_id = m.old_id;

UPDATE public.approvals a
SET quote_id = m.new_id
FROM tmp_quote_id_map m
WHERE a.quote_id = m.old_id;

UPDATE public.payments p
SET quote_id = m.new_id
FROM tmp_quote_id_map m
WHERE p.quote_id = m.old_id;

UPDATE public.quote_responses qr
SET quote_id = m.new_id
FROM tmp_quote_id_map m
WHERE qr.quote_id = m.old_id;

-- 7) Sync sequence to max current number
DO $$
DECLARE
  max_num int;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) INTO max_num FROM public.quotes;
  PERFORM setval('public.quote_id_seq', GREATEST(max_num, 1));
END$$;

-- 8) Drop temp table
DROP TABLE IF EXISTS tmp_quote_id_map;