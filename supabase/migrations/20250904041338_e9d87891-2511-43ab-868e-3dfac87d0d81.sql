-- Fix security warnings by adding search_path to existing functions
-- Update normalize_cnpj function
CREATE OR REPLACE FUNCTION public.normalize_cnpj(cnpj_in text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT regexp_replace(COALESCE(cnpj_in, ''), '[^0-9]', '', 'g');
$$;

-- Update trigger function
CREATE OR REPLACE FUNCTION public.trg_suppliers_normalize_cnpj()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.cnpj := public.normalize_cnpj(NEW.cnpj);
  RETURN NEW;
END;
$$;