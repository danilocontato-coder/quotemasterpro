-- Criar trigger para incrementar contador de uso de cotações
-- Este trigger será disparado toda vez que uma nova cotação for criada
CREATE OR REPLACE TRIGGER trigger_increment_quote_usage
  AFTER INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_quote_usage();