-- Remove trigger duplicado (mantém apenas trigger_increment_quote_usage)
DROP TRIGGER IF EXISTS quotes_usage_trigger ON public.quotes;

-- Comentário explicativo
COMMENT ON TRIGGER trigger_increment_quote_usage ON public.quotes IS 
  'Incrementa quotes_this_month em client_usage quando nova cotação é criada';