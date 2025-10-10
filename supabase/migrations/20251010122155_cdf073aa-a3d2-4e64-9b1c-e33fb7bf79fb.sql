-- Adicionar campos para periodicidade de pagamento e anexos na tabela contracts
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS payment_frequency text DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.contracts.payment_frequency IS 'Periodicidade de pagamento: monthly, quarterly, semiannual, annual';
COMMENT ON COLUMN public.contracts.attachments IS 'Array de URLs de anexos (PDFs, documentos, etc.)';

-- Criar tabela de contadores para IDs automáticos de contratos
CREATE TABLE IF NOT EXISTS public.client_contract_counters (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  current_counter integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.client_contract_counters ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se existirem
DROP POLICY IF EXISTS "client_contract_counters_select" ON public.client_contract_counters;
DROP POLICY IF EXISTS "client_contract_counters_insert" ON public.client_contract_counters;
DROP POLICY IF EXISTS "client_contract_counters_update" ON public.client_contract_counters;

-- Políticas RLS para contadores de contratos
CREATE POLICY "client_contract_counters_select"
ON public.client_contract_counters
FOR SELECT
USING (
  (get_user_role() = 'admin') OR
  (client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY "client_contract_counters_insert"
ON public.client_contract_counters
FOR INSERT
WITH CHECK (
  (get_user_role() = 'admin') OR
  (client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY "client_contract_counters_update"
ON public.client_contract_counters
FOR UPDATE
USING (
  (get_user_role() = 'admin') OR
  (client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid()))
);

-- Função para gerar próximo ID de contrato por cliente
CREATE OR REPLACE FUNCTION public.next_contract_id_by_client(
  p_client_id uuid,
  prefix text DEFAULT 'CTR'
)
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
  INSERT INTO public.client_contract_counters (client_id, current_counter)
  VALUES (p_client_id, 1)
  ON CONFLICT (client_id) 
  DO UPDATE SET 
    current_counter = client_contract_counters.current_counter + 1,
    updated_at = now()
  RETURNING current_counter INTO n;
  
  -- Formatar como CTR001 (3 dígitos)
  code_text := prefix || lpad(n::text, 3, '0');
  RETURN code_text;
END;
$$;

-- Trigger para gerar ID automático de contrato
CREATE OR REPLACE FUNCTION public.trg_contracts_set_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só gerar ID se estiver vazio ou null
  IF NEW.id IS NULL OR btrim(NEW.id) = '' THEN
    NEW.id := public.next_contract_id_by_client(NEW.client_id, 'CTR');
  END IF;
  RETURN NEW;
END;
$$;

-- Aplicar trigger na tabela contracts
DROP TRIGGER IF EXISTS trigger_contracts_set_id ON public.contracts;
CREATE TRIGGER trigger_contracts_set_id
  BEFORE INSERT ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_contracts_set_id();