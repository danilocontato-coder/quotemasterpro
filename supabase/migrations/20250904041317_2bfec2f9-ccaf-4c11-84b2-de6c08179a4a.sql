-- Ensure normalized, unique CNPJ for suppliers
-- 1) Normalization function
CREATE OR REPLACE FUNCTION public.normalize_cnpj(cnpj_in text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(COALESCE(cnpj_in, ''), '[^0-9]', '', 'g');
$$;

-- 2) Trigger to normalize on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.trg_suppliers_normalize_cnpj()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.cnpj := public.normalize_cnpj(NEW.cnpj);
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS suppliers_normalize_cnpj ON public.suppliers;

-- Create trigger
CREATE TRIGGER suppliers_normalize_cnpj
BEFORE INSERT OR UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.trg_suppliers_normalize_cnpj();

-- 3) Add unique constraint on normalized CNPJ
-- First, backfill existing rows to normalized format
UPDATE public.suppliers SET cnpj = public.normalize_cnpj(cnpj);

-- Create a unique index (concurrently is not supported in transactional migrations here)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_suppliers_cnpj_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_suppliers_cnpj_unique ON public.suppliers (cnpj);
  END IF;
END$$;