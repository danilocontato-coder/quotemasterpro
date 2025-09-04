-- Clear existing IDs and create sequential RFQ IDs starting from RFQ01
-- Handle foreign key constraints properly

-- 1) Ensure sequence exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'quote_id_seq') THEN
    CREATE SEQUENCE public.quote_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
  END IF;
END$$;

-- 2) Create helper function and trigger for auto-generation
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

-- 3) Clean up existing data and restart with RFQ01, RFQ02, etc.
-- Delete all existing quotes and related data to start fresh
TRUNCATE TABLE public.quote_responses CASCADE;
TRUNCATE TABLE public.quote_items CASCADE;
TRUNCATE TABLE public.approvals CASCADE;
TRUNCATE TABLE public.payments CASCADE;
TRUNCATE TABLE public.quotes CASCADE;

-- 4) Reset sequence to start from 1
SELECT setval('public.quote_id_seq', 1, false);

-- 5) Ensure unique index on quotes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_quotes_id'
  ) THEN
    CREATE UNIQUE INDEX uq_quotes_id ON public.quotes (id);
  END IF;
END$$;