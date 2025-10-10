-- Reset manual dos contadores para outubro
UPDATE public.client_usage
SET 
  quotes_this_month = (
    SELECT COUNT(*) 
    FROM public.quotes q 
    WHERE q.client_id = client_usage.client_id 
    AND q.created_at >= date_trunc('month', CURRENT_DATE)
  ),
  quote_responses_this_month = 0,
  last_reset_date = date_trunc('month', CURRENT_DATE)::date,
  updated_at = now()
WHERE last_reset_date < date_trunc('month', CURRENT_DATE);

-- Criar função para auto-reset no primeiro acesso do mês
CREATE OR REPLACE FUNCTION public.auto_reset_usage_if_needed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se precisa resetar para o mês atual
  IF NEW.last_reset_date < date_trunc('month', CURRENT_DATE)::date THEN
    NEW.quotes_this_month := 0;
    NEW.quote_responses_this_month := 0;
    NEW.last_reset_date := date_trunc('month', CURRENT_DATE)::date;
    NEW.updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar reset automático antes de UPDATE
DROP TRIGGER IF EXISTS auto_reset_usage_trigger ON public.client_usage;
CREATE TRIGGER auto_reset_usage_trigger
  BEFORE UPDATE ON public.client_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_reset_usage_if_needed();

-- Melhorar a função increment_quote_usage para resetar se necessário
CREATE OR REPLACE FUNCTION public.increment_quote_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Primeiro, resetar uso se necessário via get_or_create
  PERFORM public.get_or_create_client_usage(NEW.client_id);
  
  -- Depois incrementar
  INSERT INTO public.client_usage (client_id, quotes_this_month, updated_at)
  VALUES (NEW.client_id, 1, now())
  ON CONFLICT (client_id) 
  DO UPDATE SET 
    quotes_this_month = client_usage.quotes_this_month + 1,
    updated_at = now();
  
  RETURN NEW;
END;
$$;