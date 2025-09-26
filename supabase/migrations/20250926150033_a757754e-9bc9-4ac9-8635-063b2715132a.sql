-- Restore the client_id column to products table if it was removed
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS client_id UUID;

-- Restore the client_id column to suppliers table if it was removed  
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS client_id UUID;

-- Recreate the trigger function for setting client_id on products
CREATE OR REPLACE FUNCTION public.trg_products_set_client_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-definir client_id baseado no fornecedor
  IF NEW.client_id IS NULL THEN
    NEW.client_id := (
      SELECT s.client_id 
      FROM public.suppliers s 
      WHERE s.id = NEW.supplier_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Recreate the trigger
DROP TRIGGER IF EXISTS trg_products_set_client_id ON public.products;
CREATE TRIGGER trg_products_set_client_id
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_products_set_client_id();