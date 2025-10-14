-- Função para auto-associar fornecedores quando uma cotação é criada/atualizada
CREATE OR REPLACE FUNCTION public.auto_associate_quote_suppliers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas processar se houver fornecedores selecionados
  IF NEW.selected_supplier_ids IS NOT NULL AND array_length(NEW.selected_supplier_ids, 1) > 0 THEN
    -- Inserir registros em client_suppliers para cada fornecedor selecionado
    INSERT INTO public.client_suppliers (client_id, supplier_id, status, notes)
    SELECT 
      NEW.client_id,
      unnest(NEW.selected_supplier_ids),
      'active',
      'Auto-associado via cotação ' || NEW.id
    ON CONFLICT (client_id, supplier_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger que dispara após INSERT ou UPDATE de selected_supplier_ids
CREATE TRIGGER trg_auto_associate_quote_suppliers
AFTER INSERT OR UPDATE OF selected_supplier_ids ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.auto_associate_quote_suppliers();

-- [OPCIONAL] Script para popular retroativamente cotações existentes
-- Execute manualmente se necessário:
-- INSERT INTO public.client_suppliers (client_id, supplier_id, status, notes)
-- SELECT DISTINCT
--   q.client_id,
--   unnest(q.selected_supplier_ids) as supplier_id,
--   'active',
--   'Auto-associado retroativamente'
-- FROM public.quotes q
-- WHERE q.selected_supplier_ids IS NOT NULL 
--   AND array_length(q.selected_supplier_ids, 1) > 0
-- ON CONFLICT (client_id, supplier_id) DO NOTHING;