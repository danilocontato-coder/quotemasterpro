-- Adicionar Foreign Keys nomeadas para permitir JOINs automáticos no Supabase
-- Verificar se FKs já existem antes de adicionar

-- FK para supplier_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'supplier_ratings_supplier_id_fkey'
  ) THEN
    ALTER TABLE public.supplier_ratings
      ADD CONSTRAINT supplier_ratings_supplier_id_fkey 
      FOREIGN KEY (supplier_id) 
      REFERENCES public.suppliers(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- FK para quote_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'supplier_ratings_quote_id_fkey'
  ) THEN
    ALTER TABLE public.supplier_ratings
      ADD CONSTRAINT supplier_ratings_quote_id_fkey 
      FOREIGN KEY (quote_id) 
      REFERENCES public.quotes(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- FK para delivery_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'supplier_ratings_delivery_id_fkey'
  ) THEN
    ALTER TABLE public.supplier_ratings
      ADD CONSTRAINT supplier_ratings_delivery_id_fkey 
      FOREIGN KEY (delivery_id) 
      REFERENCES public.deliveries(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Adicionar comentários para documentação
COMMENT ON CONSTRAINT supplier_ratings_supplier_id_fkey ON public.supplier_ratings 
  IS 'Links rating to supplier';
COMMENT ON CONSTRAINT supplier_ratings_quote_id_fkey ON public.supplier_ratings 
  IS 'Links rating to quote';
COMMENT ON CONSTRAINT supplier_ratings_delivery_id_fkey ON public.supplier_ratings 
  IS 'Links rating to delivery';