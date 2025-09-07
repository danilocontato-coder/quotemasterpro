-- Criar tabela para controlar contadores de RFQ por cliente
CREATE TABLE IF NOT EXISTS public.client_quote_counters (
  client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  current_counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.client_quote_counters ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso apenas ao próprio cliente
CREATE POLICY "client_quote_counters_select" ON public.client_quote_counters
FOR SELECT USING (
  get_user_role() = 'admin'::text OR 
  client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
);

CREATE POLICY "client_quote_counters_insert" ON public.client_quote_counters
FOR INSERT WITH CHECK (
  get_user_role() = 'admin'::text OR 
  client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
);

CREATE POLICY "client_quote_counters_update" ON public.client_quote_counters
FOR UPDATE USING (
  get_user_role() = 'admin'::text OR 
  client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
);

-- Função para gerar próximo ID de cotação por cliente
CREATE OR REPLACE FUNCTION public.next_quote_id_by_client(p_client_id UUID, prefix text DEFAULT 'RFQ'::text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
  code_text TEXT;
BEGIN
  -- Inserir ou atualizar contador do cliente
  INSERT INTO public.client_quote_counters (client_id, current_counter)
  VALUES (p_client_id, 1)
  ON CONFLICT (client_id) 
  DO UPDATE SET 
    current_counter = client_quote_counters.current_counter + 1,
    updated_at = now()
  RETURNING current_counter INTO n;
  
  -- Formatar como RFQxx (2 dígitos)
  code_text := prefix || lpad(n::text, 2, '0');
  RETURN code_text;
END;
$$;

-- Atualizar trigger para usar a nova função por cliente
CREATE OR REPLACE FUNCTION public.trg_quotes_set_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só gerar ID se estiver vazio ou null
  IF NEW.id IS NULL OR btrim(NEW.id) = '' THEN
    -- Usar a função que gera ID por cliente
    NEW.id := public.next_quote_id_by_client(NEW.client_id, 'RFQ');
  END IF;
  RETURN NEW;
END;
$$;