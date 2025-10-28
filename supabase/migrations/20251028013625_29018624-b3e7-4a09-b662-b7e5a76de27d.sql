-- =====================================================
-- Migration: Corrigir search_path nas funções criadas
-- =====================================================

-- Recriar função decrement_client_usage_on_quote_delete com search_path
CREATE OR REPLACE FUNCTION decrement_client_usage_on_quote_delete()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE client_usage
  SET quotes_this_month = GREATEST(0, quotes_this_month - 1),
      updated_at = NOW()
  WHERE client_id = OLD.client_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Recriar função check_usage_integrity com search_path
CREATE OR REPLACE FUNCTION check_usage_integrity()
RETURNS TABLE(
  client_id uuid,
  client_name text,
  stored_count integer,
  actual_count bigint,
  difference integer
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    cu.quotes_this_month,
    COUNT(q.id),
    (cu.quotes_this_month - COUNT(q.id))::integer as diff
  FROM clients c
  LEFT JOIN client_usage cu ON cu.client_id = c.id
  LEFT JOIN quotes q ON q.client_id = c.id 
    AND q.created_at >= date_trunc('month', CURRENT_DATE)
  GROUP BY c.id, c.name, cu.quotes_this_month
  HAVING cu.quotes_this_month != COALESCE(COUNT(q.id), 0);
END;
$$ LANGUAGE plpgsql;

-- Recriar função recalculate_client_quotes com search_path
CREATE OR REPLACE FUNCTION recalculate_client_quotes(p_client_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct_count INTEGER;
BEGIN
  -- Contar cotações reais deste mês
  SELECT COUNT(*)
  INTO v_correct_count
  FROM quotes q
  WHERE q.client_id = p_client_id
    AND q.created_at >= date_trunc('month', CURRENT_DATE);
  
  -- Atualizar client_usage
  UPDATE client_usage
  SET quotes_this_month = v_correct_count,
      updated_at = NOW()
  WHERE client_id = p_client_id;
  
  -- Log da correção
  INSERT INTO audit_logs (action, entity_type, entity_id, panel_type, details)
  VALUES (
    'USAGE_RECALCULATION',
    'client_usage',
    p_client_id::text,
    'system',
    jsonb_build_object(
      'client_id', p_client_id,
      'new_quotes_this_month', v_correct_count,
      'reason', 'Manual recalculation via function',
      'timestamp', NOW()
    )
  );
END;
$$ LANGUAGE plpgsql;