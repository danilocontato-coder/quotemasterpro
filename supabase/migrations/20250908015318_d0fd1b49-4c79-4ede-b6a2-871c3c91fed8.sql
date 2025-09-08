-- Atualizar função para usar valor da melhor proposta dos fornecedores
CREATE OR REPLACE FUNCTION public.trigger_ai_negotiation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  best_response_amount NUMERIC := 0;
BEGIN
  -- Se a cotação mudou para 'received', criar análise da IA usando o valor da melhor proposta
  IF OLD.status != 'received' AND NEW.status = 'received' THEN
    -- Buscar o menor valor das propostas para usar como original_amount
    SELECT COALESCE(MIN(total_amount), 0) INTO best_response_amount
    FROM public.quote_responses 
    WHERE quote_id = NEW.id;
    
    -- Inserir registro de negociação IA com o valor da melhor proposta
    INSERT INTO public.ai_negotiations (quote_id, original_amount, status)
    VALUES (NEW.id, best_response_amount, 'analyzing');
  END IF;
  
  RETURN NEW;
END;
$function$;