-- Função para criar automaticamente análise IA quando cotação recebe todas as propostas
CREATE OR REPLACE FUNCTION public.trigger_ai_negotiation()
RETURNS TRIGGER AS $$
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
    INSERT INTO public.ai_negotiations (quote_id, original_amount, status, client_id)
    VALUES (NEW.id, best_response_amount, 'analyzing', NEW.client_id)
    ON CONFLICT (quote_id) DO UPDATE SET
      status = 'analyzing',
      original_amount = best_response_amount,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar trigger na tabela quotes (substituir o existente)
DROP TRIGGER IF EXISTS trg_quote_ai_negotiation ON public.quotes;
CREATE TRIGGER trg_quote_ai_negotiation
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_ai_negotiation();

COMMENT ON FUNCTION public.trigger_ai_negotiation() IS 'Cria automaticamente uma análise IA quando uma cotação recebe todas as propostas (status = received)';
