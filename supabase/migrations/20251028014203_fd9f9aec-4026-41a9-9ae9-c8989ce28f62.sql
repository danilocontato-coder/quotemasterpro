-- =====================================================
-- CORREÇÃO DE SEGURANÇA CRÍTICA: Prevenir Bypass de Quota
-- =====================================================
-- Data: 2025-10-28
-- Vulnerabilidade: Usuários podiam criar cotações ilimitadas deletando e recriando
-- Solução: Remover trigger de decremento, contador agora é SOMENTE incremental
-- =====================================================

-- 1. REMOVER TRIGGER E FUNÇÃO VULNERÁVEIS
DROP TRIGGER IF EXISTS trigger_decrement_usage_on_quote_delete ON quotes;
DROP FUNCTION IF EXISTS decrement_client_usage_on_quote_delete();

-- 2. ADICIONAR COMENTÁRIO DE SEGURANÇA
COMMENT ON COLUMN client_usage.quotes_this_month IS 
  'Total acumulativo de cotações CRIADAS no mês. NUNCA decrementar ao deletar cotações (prevenção de bypass de limites do plano).';

-- 3. DROPAR E RECRIAR FUNÇÃO DE VERIFICAÇÃO DE INTEGRIDADE
DROP FUNCTION IF EXISTS check_usage_integrity();

CREATE OR REPLACE FUNCTION check_usage_integrity()
RETURNS TABLE(
  client_id uuid,
  client_name text,
  stored_count integer,
  actual_count bigint,
  deleted_count integer,
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
    CASE 
      WHEN cu.quotes_this_month < COUNT(q.id) THEN 'ERROR: Counter too low'
      WHEN cu.quotes_this_month = COUNT(q.id) THEN 'OK: No deletions'
      WHEN cu.quotes_this_month > COUNT(q.id) THEN 'OK: Has deletions'
      ELSE 'OK'
    END as status
  FROM clients c
  LEFT JOIN client_usage cu ON cu.client_id = c.id
  LEFT JOIN quotes q ON q.client_id = c.id 
    AND q.created_at >= date_trunc('month', CURRENT_DATE)
  GROUP BY c.id, c.name, cu.quotes_this_month;
END;
$$ LANGUAGE plpgsql;

-- 4. DROPAR E RECRIAR FUNÇÃO DE RECÁLCULO
DROP FUNCTION IF EXISTS recalculate_client_quotes(uuid);

CREATE OR REPLACE FUNCTION recalculate_client_quotes(p_client_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count INTEGER;
  v_old_count INTEGER;
BEGIN
  -- Obter contador atual
  SELECT quotes_this_month INTO v_old_count
  FROM client_usage
  WHERE client_id = p_client_id;
  
  -- Contar cotações EXISTENTES deste mês
  SELECT COUNT(*)
  INTO v_current_count
  FROM quotes q
  WHERE q.client_id = p_client_id
    AND q.created_at >= date_trunc('month', CURRENT_DATE);
  
  -- IMPORTANTE: Só atualizar se o contador atual for MENOR que o real
  -- (correção de contadores decrementados pela vulnerabilidade)
  IF v_old_count < v_current_count THEN
    UPDATE client_usage
    SET quotes_this_month = v_current_count,
        updated_at = NOW()
    WHERE client_id = p_client_id;
    
    -- Log da correção
    INSERT INTO audit_logs (action, entity_type, entity_id, panel_type, details)
    VALUES (
      'USAGE_CORRECTION',
      'client_usage',
      p_client_id::text,
      'system',
      jsonb_build_object(
        'old_count', v_old_count,
        'new_count', v_current_count,
        'reason', 'Fixed counter decremented by vulnerability'
      )
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'old_count', v_old_count,
      'new_count', v_current_count,
      'corrected', true
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'old_count', v_old_count,
      'current_quotes', v_current_count,
      'corrected', false,
      'message', 'Counter is correct or higher (has deleted quotes)'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. CRIAR FUNÇÃO DE LOG DE CORREÇÕES DE SEGURANÇA
CREATE OR REPLACE FUNCTION log_security_fix(
  p_fix_type text,
  p_description text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (action, entity_type, entity_id, panel_type, details)
  VALUES (
    'SECURITY_FIX',
    'system',
    'security',
    'system',
    jsonb_build_object(
      'fix_type', p_fix_type,
      'description', p_description,
      'details', p_details,
      'timestamp', NOW(),
      'severity', 'CRITICAL'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- 6. REGISTRAR A CORREÇÃO NO LOG
SELECT log_security_fix(
  'QUOTA_BYPASS_PREVENTION',
  'Removed decrement trigger on quote deletion to prevent quota bypass',
  jsonb_build_object(
    'vulnerability', 'Users could create unlimited quotes by deleting and recreating',
    'affected_function', 'decrement_client_usage_on_quote_delete',
    'affected_trigger', 'trigger_decrement_usage_on_quote_delete',
    'action_taken', 'Removed trigger and function - counter now only increments',
    'impact', 'All future quote deletions will not decrement quota',
    'corrective_action', 'Use recalculate_client_quotes() to fix any clients with decremented counters'
  )
);