-- Função que atualiza o status da quote baseado nas visitas
CREATE OR REPLACE FUNCTION update_quote_status_on_visit_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_suppliers INTEGER;
  scheduled_or_confirmed_count INTEGER;
  new_status TEXT;
BEGIN
  -- Buscar total de fornecedores da cotação
  SELECT suppliers_sent_count INTO total_suppliers
  FROM quotes
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  
  -- Contar fornecedores únicos com visita agendada ou confirmada
  SELECT COUNT(DISTINCT supplier_id) INTO scheduled_or_confirmed_count
  FROM quote_visits
  WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
    AND status IN ('scheduled', 'confirmed');
  
  -- Determinar novo status baseado no progresso
  IF scheduled_or_confirmed_count = 0 THEN
    new_status := 'awaiting_visit';
  ELSIF scheduled_or_confirmed_count < total_suppliers THEN
    new_status := 'visit_partial_scheduled';
  ELSE
    new_status := 'visit_scheduled';
  END IF;
  
  -- Atualizar status da quote
  UPDATE quotes
  SET status = new_status,
      updated_at = NOW()
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Criar trigger para INSERT, UPDATE e DELETE em quote_visits
DROP TRIGGER IF EXISTS trg_update_quote_status_on_visit ON quote_visits;
CREATE TRIGGER trg_update_quote_status_on_visit
  AFTER INSERT OR UPDATE OR DELETE ON quote_visits
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_status_on_visit_change();

-- Script de correção pontual para RFQ38 e outras quotes com visitas
WITH visit_stats AS (
  SELECT 
    quote_id,
    COUNT(DISTINCT supplier_id) FILTER (WHERE status IN ('scheduled', 'confirmed')) as scheduled_count
  FROM quote_visits
  GROUP BY quote_id
)
UPDATE quotes q
SET status = CASE
  WHEN vs.scheduled_count = 0 THEN 'awaiting_visit'
  WHEN vs.scheduled_count < q.suppliers_sent_count THEN 'visit_partial_scheduled'
  ELSE 'visit_scheduled'
END,
updated_at = NOW()
FROM visit_stats vs
WHERE q.id = vs.quote_id
  AND q.status IN ('sent', 'awaiting_visit', 'visit_partial_scheduled', 'visit_scheduled');