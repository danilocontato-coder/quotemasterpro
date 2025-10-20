-- Corrigir search_path da função de updated_at
CREATE OR REPLACE FUNCTION public.update_accountability_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;