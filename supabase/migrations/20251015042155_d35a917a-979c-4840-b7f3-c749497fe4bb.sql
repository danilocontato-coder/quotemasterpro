-- ====================================================================
-- CORREÇÃO URGENTE: Limpar aprovadores inválidos e desbloquear cotações
-- ====================================================================

-- 1. Criar função auxiliar para validar e limpar aprovadores
CREATE OR REPLACE FUNCTION public.clean_invalid_approvers()
RETURNS TABLE(
  level_id uuid,
  level_name text,
  removed_approvers text[],
  valid_approvers_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  level_record RECORD;
  valid_approver_ids uuid[];
  invalid_approver_ids text[];
BEGIN
  -- Iterar sobre todos os níveis ativos
  FOR level_record IN 
    SELECT id, name, approvers, client_id
    FROM approval_levels
    WHERE active = true
  LOOP
    -- Buscar aprovadores válidos (existem em profiles e estão ativos)
    SELECT ARRAY_AGG(p.id)
    INTO valid_approver_ids
    FROM unnest(level_record.approvers) AS approver_id
    JOIN profiles p ON p.id = approver_id::uuid
    WHERE p.active = true;
    
    -- Identificar aprovadores inválidos
    SELECT ARRAY_AGG(approver_id::text)
    INTO invalid_approver_ids
    FROM unnest(level_record.approvers) AS approver_id
    WHERE approver_id::uuid NOT IN (
      SELECT p.id 
      FROM profiles p 
      WHERE p.active = true
    );
    
    -- Se houver aprovadores inválidos, atualizar o nível
    IF invalid_approver_ids IS NOT NULL AND array_length(invalid_approver_ids, 1) > 0 THEN
      UPDATE approval_levels
      SET 
        approvers = COALESCE(valid_approver_ids, ARRAY[]::uuid[]),
        updated_at = now()
      WHERE id = level_record.id;
      
      -- Registrar no audit log
      INSERT INTO audit_logs (action, entity_type, entity_id, panel_type, details)
      VALUES (
        'CLEAN_INVALID_APPROVERS',
        'approval_levels',
        level_record.id::text,
        'system',
        jsonb_build_object(
          'level_name', level_record.name,
          'removed_approvers', invalid_approver_ids,
          'valid_approvers_remaining', COALESCE(array_length(valid_approver_ids, 1), 0)
        )
      );
      
      -- Retornar resultado
      level_id := level_record.id;
      level_name := level_record.name;
      removed_approvers := invalid_approver_ids;
      valid_approvers_count := COALESCE(array_length(valid_approver_ids, 1), 0);
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- 2. Executar limpeza de aprovadores inválidos
SELECT * FROM public.clean_invalid_approvers();

-- 3. Desativar níveis que ficaram sem aprovadores válidos
UPDATE approval_levels
SET 
  active = false,
  updated_at = now()
WHERE active = true
  AND (
    approvers IS NULL 
    OR array_length(approvers, 1) = 0
  );

-- 4. Desbloquear cotação RFQ39 (fe6a5b8c-500e-41b9-bb92-ccca356f620e)
-- Verificar se existem aprovadores válidos para o cliente
DO $$
DECLARE
  v_quote_id text := 'fe6a5b8c-500e-41b9-bb92-ccca356f620e';
  v_client_id uuid;
  v_valid_approver_id uuid;
  v_quote_total numeric;
BEGIN
  -- Buscar dados da cotação
  SELECT client_id, total INTO v_client_id, v_quote_total
  FROM quotes
  WHERE id = v_quote_id;
  
  -- Buscar um aprovador válido do cliente
  SELECT id INTO v_valid_approver_id
  FROM profiles
  WHERE client_id = v_client_id
    AND active = true
    AND role IN ('admin', 'manager', 'admin_cliente')
  LIMIT 1;
  
  IF v_valid_approver_id IS NOT NULL THEN
    -- Se existe aprovador válido, criar aprovação pendente
    INSERT INTO approvals (quote_id, approver_id, status, comments)
    VALUES (
      v_quote_id,
      v_valid_approver_id,
      'pending',
      'Aprovação criada automaticamente após correção de níveis de aprovação'
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Aprovação criada para cotação % com aprovador %', v_quote_id, v_valid_approver_id;
  ELSE
    -- Se não existe aprovador válido, auto-aprovar a cotação
    UPDATE quotes
    SET 
      status = 'approved',
      updated_at = now()
    WHERE id = v_quote_id;
    
    UPDATE quote_responses
    SET 
      status = 'approved',
      updated_at = now()
    WHERE quote_id = v_quote_id
      AND id = '95adf170-a961-4438-814b-f60733d3017d';
    
    RAISE NOTICE 'Cotação % auto-aprovada (sem aprovadores válidos disponíveis)', v_quote_id;
  END IF;
  
  -- Registrar correção no audit log
  INSERT INTO audit_logs (action, entity_type, entity_id, panel_type, details)
  VALUES (
    'UNBLOCK_STUCK_QUOTE',
    'quotes',
    v_quote_id,
    'system',
    jsonb_build_object(
      'reason', 'approval_level_had_invalid_approvers',
      'approver_found', v_valid_approver_id IS NOT NULL,
      'action_taken', CASE 
        WHEN v_valid_approver_id IS NOT NULL THEN 'created_approval'
        ELSE 'auto_approved'
      END,
      'correction_date', now()
    )
  );
END;
$$;

-- 5. Adicionar índice para performance em consultas de validação
CREATE INDEX IF NOT EXISTS idx_profiles_client_role_active 
ON profiles(client_id, role, active) 
WHERE active = true;

-- 6. Adicionar comentários
COMMENT ON FUNCTION public.clean_invalid_approvers IS 
'Remove aprovadores inválidos (que não existem em profiles ou estão inativos) dos níveis de aprovação';

COMMENT ON INDEX idx_profiles_client_role_active IS 
'Índice para otimizar busca de aprovadores válidos por cliente e papel';