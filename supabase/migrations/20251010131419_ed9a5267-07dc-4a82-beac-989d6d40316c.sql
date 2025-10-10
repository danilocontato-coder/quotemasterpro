-- Corrigir trigger para definir contract_number automaticamente
CREATE OR REPLACE FUNCTION public.trg_contracts_set_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Gerar ID se estiver vazio ou null
  IF NEW.id IS NULL OR btrim(NEW.id) = '' THEN
    NEW.id := public.next_contract_id_by_client(NEW.client_id, 'CTR');
  END IF;
  
  -- Definir contract_number igual ao ID se estiver vazio ou null
  IF NEW.contract_number IS NULL OR btrim(NEW.contract_number) = '' THEN
    NEW.contract_number := NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;