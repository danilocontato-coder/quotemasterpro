-- Criar função para atualizar items_count automaticamente
CREATE OR REPLACE FUNCTION public.update_quote_items_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Para INSERT e UPDATE, usar NEW.quote_id
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.quotes
    SET 
      items_count = (
        SELECT COUNT(*) 
        FROM public.quote_items 
        WHERE quote_id = NEW.quote_id
      ),
      updated_at = now()
    WHERE id = NEW.quote_id;
    RETURN NEW;
  
  -- Para DELETE, usar OLD.quote_id
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.quotes
    SET 
      items_count = (
        SELECT COUNT(*) 
        FROM public.quote_items 
        WHERE quote_id = OLD.quote_id
      ),
      updated_at = now()
    WHERE id = OLD.quote_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Criar trigger para executar a função automaticamente
DROP TRIGGER IF EXISTS trg_update_quote_items_count ON public.quote_items;

CREATE TRIGGER trg_update_quote_items_count
  AFTER INSERT OR UPDATE OR DELETE ON public.quote_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quote_items_count();

-- Atualizar items_count para todas as cotações existentes
UPDATE public.quotes 
SET items_count = (
  SELECT COUNT(*) 
  FROM public.quote_items 
  WHERE quote_items.quote_id = quotes.id
);

-- Verificar se a atualização funcionou
SELECT 
  q.id,
  q.title,
  q.items_count,
  (SELECT COUNT(*) FROM public.quote_items WHERE quote_id = q.id) as actual_count
FROM public.quotes q
ORDER BY q.created_at DESC
LIMIT 5;