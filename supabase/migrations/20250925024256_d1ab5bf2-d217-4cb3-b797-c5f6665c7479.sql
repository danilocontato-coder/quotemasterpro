-- Criar tabela para controlar contadores de pagamentos por cliente
CREATE TABLE IF NOT EXISTS public.client_payment_counters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  current_counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.client_payment_counters ENABLE ROW LEVEL SECURITY;

-- Política para admins verem tudo
CREATE POLICY "Admins can manage all client payment counters" 
ON public.client_payment_counters 
FOR ALL 
USING (get_user_role() = 'admin'::text);

-- Política para clientes verem/gerenciarem seus próprios contadores
CREATE POLICY "Clients can view their payment counters" 
ON public.client_payment_counters 
FOR SELECT 
USING (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()));

-- Função para gerar próximo ID de pagamento por cliente
CREATE OR REPLACE FUNCTION public.next_payment_id_by_client(p_client_id UUID, prefix TEXT DEFAULT 'PG')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  n INTEGER;
  code_text TEXT;
BEGIN
  -- Inserir ou atualizar contador do cliente
  INSERT INTO public.client_payment_counters (client_id, current_counter)
  VALUES (p_client_id, 1)
  ON CONFLICT (client_id) 
  DO UPDATE SET 
    current_counter = client_payment_counters.current_counter + 1,
    updated_at = now()
  RETURNING current_counter INTO n;
  
  -- Formatar como PG001 (3 dígitos)
  code_text := prefix || lpad(n::text, 3, '0');
  RETURN code_text;
END;
$$;

-- Trigger para gerar ID automaticamente
CREATE OR REPLACE FUNCTION public.trg_payments_set_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Só gerar ID se estiver vazio ou null
  IF NEW.id IS NULL OR btrim(NEW.id) = '' THEN
    -- Usar a função que gera ID por cliente
    NEW.id := public.next_payment_id_by_client(NEW.client_id, 'PG');
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger na tabela payments
DROP TRIGGER IF EXISTS trg_payments_set_id ON public.payments;
CREATE TRIGGER trg_payments_set_id
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_payments_set_id();