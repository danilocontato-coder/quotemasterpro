-- Correção: Drop função check_usage_integrity antes de recriar
DROP FUNCTION IF EXISTS check_usage_integrity();

-- Recriar com nova assinatura
CREATE OR REPLACE FUNCTION check_usage_integrity()
RETURNS TABLE(
  client_id uuid,
  client_name text,
  stored_count integer,
  actual_count bigint,
  deleted_count integer,
  billing_anchor_day integer,
  billing_period_start date,
  last_reset_date date,
  next_reset_date date,
  days_until_reset integer,
  status text
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
    COUNT(q.id) as current_quotes,
    (cu.quotes_this_month - COUNT(q.id))::integer as deleted_quotes,
    cu.billing_anchor_day,
    get_billing_period_start(c.id, CURRENT_DATE) as period_start,
    cu.last_reset_date,
    (get_billing_period_start(c.id, CURRENT_DATE) + INTERVAL '1 month')::DATE as next_reset,
    ((get_billing_period_start(c.id, CURRENT_DATE) + INTERVAL '1 month')::DATE - CURRENT_DATE)::integer as days_remaining,
    CASE 
      WHEN cu.quotes_this_month < COUNT(q.id) THEN '❌ ERROR: Counter too low'
      WHEN cu.last_reset_date < get_billing_period_start(c.id, CURRENT_DATE) THEN '⚠️ WARN: Needs reset'
      WHEN cu.quotes_this_month = COUNT(q.id) THEN '✅ OK: No deletions'
      WHEN cu.quotes_this_month > COUNT(q.id) THEN '✅ OK: Has deletions'
    END as status
  FROM clients c
  LEFT JOIN client_usage cu ON cu.client_id = c.id
  LEFT JOIN quotes q ON q.client_id = c.id 
    AND q.created_at >= get_billing_period_start(c.id, CURRENT_DATE)
  GROUP BY c.id, c.name, cu.quotes_this_month, cu.billing_anchor_day, cu.last_reset_date;
END;
$$ LANGUAGE plpgsql;