-- Criar tabela para rastrear uso dos clientes
CREATE TABLE IF NOT EXISTS public.client_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Contadores mensais (reset no primeiro dia do mês)
  quotes_this_month INTEGER NOT NULL DEFAULT 0,
  users_count INTEGER NOT NULL DEFAULT 0,
  storage_used_gb DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Contadores para fornecedores (se aplicável)
  quote_responses_this_month INTEGER NOT NULL DEFAULT 0,
  products_in_catalog INTEGER NOT NULL DEFAULT 0,
  categories_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadados
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(client_id)
);

-- Habilitar RLS
ALTER TABLE public.client_usage ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para client_usage
CREATE POLICY "client_usage_select" ON public.client_usage
FOR SELECT
USING (
  (get_user_role() = 'admin'::text) OR 
  (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()))
);

CREATE POLICY "client_usage_update" ON public.client_usage
FOR UPDATE 
USING (
  (get_user_role() = 'admin'::text) OR 
  (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()))
);

CREATE POLICY "client_usage_insert" ON public.client_usage
FOR INSERT
WITH CHECK (
  (get_user_role() = 'admin'::text) OR 
  (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()))
);

-- Função para resetar contadores mensais
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.client_usage 
  SET 
    quotes_this_month = 0,
    quote_responses_this_month = 0,
    last_reset_date = CURRENT_DATE,
    updated_at = now()
  WHERE last_reset_date < date_trunc('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar uso quando cotação é criada
CREATE OR REPLACE FUNCTION public.increment_quote_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir ou atualizar uso do cliente
  INSERT INTO public.client_usage (client_id, quotes_this_month, updated_at)
  VALUES (NEW.client_id, 1, now())
  ON CONFLICT (client_id) 
  DO UPDATE SET 
    quotes_this_month = client_usage.quotes_this_month + 1,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para incrementar quando cotação é criada
CREATE TRIGGER quotes_usage_trigger
  AFTER INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_quote_usage();

-- Função para obter ou criar registro de uso do cliente
CREATE OR REPLACE FUNCTION public.get_or_create_client_usage(client_uuid UUID)
RETURNS client_usage AS $$
DECLARE
  usage_record public.client_usage;
BEGIN
  -- Primeiro, tenta resetar contadores se necessário
  PERFORM public.reset_monthly_usage();
  
  -- Busca registro existente
  SELECT * INTO usage_record
  FROM public.client_usage
  WHERE client_id = client_uuid;
  
  -- Se não existe, cria um novo
  IF NOT FOUND THEN
    INSERT INTO public.client_usage (client_id)
    VALUES (client_uuid)
    RETURNING * INTO usage_record;
  END IF;
  
  RETURN usage_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;