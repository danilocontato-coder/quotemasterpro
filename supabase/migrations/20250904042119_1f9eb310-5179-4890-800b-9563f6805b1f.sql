-- Quote ID sequentialization and auto-generation
-- 1) Create sequence for RFQ IDs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'quote_id_seq') THEN
    CREATE SEQUENCE public.quote_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
  END IF;
END$$;

-- 2) Function to build next RFQ id (RFQ01, RFQ02, ...)
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
  -- pad to 2 digits at least, will naturally grow to 3, 4, ...
  num_text := lpad(n::text, 2, '0');
  RETURN prefix || num_text;
END;
$$;

-- 3) Trigger to set id on insert when not provided
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

-- 4) Ensure unique index on quotes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_quotes_id'
  ) THEN
    CREATE UNIQUE INDEX uq_quotes_id ON public.quotes (id);
  END IF;
END$$;

-- 5) Renumber existing quote IDs to RFQ01, RFQ02, ... in created_at order
-- Create a mapping (old_id -> new_id)
WITH ordered AS (
  SELECT id AS old_id,
         'RFQ' || lpad(ROW_NUMBER() OVER (ORDER BY created_at, id)::text, 2, '0') AS new_id
  FROM public.quotes
), do_updates AS (
  UPDATE public.quotes q
  SET id = o.new_id
  FROM ordered o
  WHERE q.id = o.old_id
  RETURNING o.old_id, o.new_id
)
-- Update referencing tables using the mapping
UPDATE public.quote_items qi
SET quote_id = u.new_id
FROM do_updates u
WHERE qi.quote_id = u.old_id;

UPDATE public.approvals a
SET quote_id = u.new_id
FROM do_updates u
WHERE a.quote_id = u.old_id;

UPDATE public.payments p
SET quote_id = u.new_id
FROM do_updates u
WHERE p.quote_id = u.old_id;

UPDATE public.quote_responses qr
SET quote_id = u.new_id
FROM do_updates u
WHERE qr.quote_id = u.old_id;

-- 6) Sync sequence to max current number
DO $$
DECLARE
  max_num int;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '[^0-9]', '', 'g'), '')::int), 0) INTO max_num FROM public.quotes;
  PERFORM setval('public.quote_id_seq', GREATEST(max_num, 1));
END$$;