-- Migration: Adicionar search_path seguro à função update_quote_responses_count_and_status
-- Problema: Função SECURITY DEFINER sem search_path explícito (vulnerabilidade de segurança)

CREATE OR REPLACE FUNCTION update_quote_responses_count_and_status()
RETURNS TRIGGER AS $$
DECLARE
  current_responses_count INTEGER;
  invited_suppliers_count INTEGER;
  new_status TEXT;
BEGIN
  -- Contar respostas válidas (incluindo 'submitted')
  current_responses_count := (
    SELECT COUNT(*) 
    FROM quote_responses qr 
    WHERE qr.quote_id = NEW.quote_id 
    AND qr.status IN ('sent', 'submitted')
  );

  -- Contar fornecedores convidados
  invited_suppliers_count := (
    SELECT COUNT(DISTINCT supplier_id)
    FROM quote_suppliers
    WHERE quote_id = NEW.quote_id
  );

  -- Determinar novo status
  new_status := CASE
    WHEN current_responses_count = 0 THEN 'receiving'
    WHEN current_responses_count < invited_suppliers_count THEN 'receiving'
    WHEN current_responses_count = invited_suppliers_count THEN 'received'
    ELSE 'receiving'
  END;

  -- Atualizar quote com novo status e contador
  UPDATE quotes 
  SET 
    responses_count = current_responses_count,
    status = new_status,
    updated_at = now()
  WHERE id = NEW.quote_id
  AND status = 'receiving';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp;