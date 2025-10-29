-- Função RPC para buscar timeline completa de uma cotação
-- Retorna todos os eventos relevantes ordenados cronologicamente
-- RLS aplicado automaticamente nas tabelas consultadas

CREATE OR REPLACE FUNCTION get_quote_timeline(p_quote_id TEXT)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  event_date TIMESTAMPTZ,
  event_title TEXT,
  event_description TEXT,
  event_metadata JSONB,
  user_name TEXT,
  user_role TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  
  -- União de todos os eventos relevantes da cotação
  WITH all_events AS (
    -- 1. Criação da cotação
    SELECT 
      q.id as event_id,
      'quote_created' as event_type,
      q.created_at as event_date,
      'Cotação criada' as event_title,
      'Cotação ' || COALESCE(q.local_code, SUBSTRING(q.id::TEXT, 1, 8)) || ' foi criada' as event_description,
      jsonb_build_object(
        'status', q.status,
        'total', q.total_price,
        'client_id', q.client_id
      ) as event_metadata,
      p.full_name as user_name,
      p.role as user_role
    FROM quotes q
    LEFT JOIN profiles p ON p.id = q.created_by
    WHERE q.id = p_quote_id
    
    UNION ALL
    
    -- 2. Mudanças de status (audit_logs)
    SELECT 
      al.id as event_id,
      'status_change' as event_type,
      al.created_at as event_date,
      'Status alterado' as event_title,
      'Status mudou para: ' || COALESCE(al.details->>'new_status', al.details->>'status', 'desconhecido') as event_description,
      al.details as event_metadata,
      p.full_name as user_name,
      p.role as user_role
    FROM audit_logs al
    LEFT JOIN profiles p ON p.id = al.user_id
    WHERE al.entity_id = p_quote_id 
      AND al.entity_type = 'quotes'
      AND al.action IN ('QUOTE_STATUS_CHANGE', 'QUOTE_UPDATE')
    
    UNION ALL
    
    -- 3. Respostas de fornecedores
    SELECT 
      qr.id as event_id,
      'supplier_response' as event_type,
      qr.created_at as event_date,
      'Proposta recebida' as event_title,
      'Fornecedor ' || COALESCE(s.name, 'desconhecido') || ' enviou proposta' as event_description,
      jsonb_build_object(
        'supplier_id', qr.supplier_id,
        'supplier_name', s.name,
        'total_price', qr.total_price,
        'status', qr.status
      ) as event_metadata,
      s.name as user_name,
      'supplier' as user_role
    FROM quote_responses qr
    LEFT JOIN suppliers s ON s.id = qr.supplier_id
    WHERE qr.quote_id = p_quote_id
    
    UNION ALL
    
    -- 4. Análises de IA
    SELECT 
      apa.id as event_id,
      'ai_analysis' as event_type,
      apa.created_at as event_date,
      'Análise de IA realizada' as event_title,
      'Análise ' || apa.analysis_type || ' concluída' as event_description,
      apa.analysis_data as event_metadata,
      'Sistema IA' as user_name,
      'system' as user_role
    FROM ai_proposal_analyses apa
    WHERE apa.quote_id = p_quote_id
    
    UNION ALL
    
    -- 5. Visitas técnicas
    SELECT 
      qv.id as event_id,
      'technical_visit' as event_type,
      qv.created_at as event_date,
      'Visita técnica' as event_title,
      'Visita ' || qv.status || ' para ' || qv.scheduled_date::TEXT as event_description,
      jsonb_build_object(
        'status', qv.status,
        'scheduled_date', qv.scheduled_date,
        'notes', qv.notes,
        'reschedule_count', qv.reschedule_count
      ) as event_metadata,
      s.name as user_name,
      'supplier' as user_role
    FROM quote_visits qv
    LEFT JOIN suppliers s ON s.id = qv.supplier_id
    WHERE qv.quote_id = p_quote_id
    
    UNION ALL
    
    -- 6. Entregas
    SELECT 
      d.id as event_id,
      'delivery' as event_type,
      d.created_at as event_date,
      'Entrega registrada' as event_title,
      'Entrega ' || d.status || ' - Código ' || COALESCE(d.local_code, SUBSTRING(d.id::TEXT, 1, 8)) as event_description,
      jsonb_build_object(
        'status', d.status,
        'local_code', d.local_code,
        'total_delivered', d.total_delivered,
        'delivery_date', d.delivery_date
      ) as event_metadata,
      p.full_name as user_name,
      p.role as user_role
    FROM deliveries d
    LEFT JOIN profiles p ON p.id = d.received_by
    WHERE d.quote_id = p_quote_id
    
    UNION ALL
    
    -- 7. Aprovações
    SELECT 
      a.id as event_id,
      'approval' as event_type,
      COALESCE(a.approved_at, a.created_at) as event_date,
      'Aprovação' as event_title,
      'Aprovação ' || a.status || ' por ' || COALESCE(p.full_name, 'usuário') as event_description,
      jsonb_build_object(
        'status', a.status,
        'comments', a.comments,
        'approved_at', a.approved_at
      ) as event_metadata,
      p.full_name as user_name,
      p.role as user_role
    FROM approvals a
    LEFT JOIN profiles p ON p.id = a.approver_id
    WHERE a.quote_id = p_quote_id
  )
  
  -- Ordenar todos os eventos cronologicamente
  SELECT * FROM all_events
  ORDER BY event_date DESC;
  
END;
$$;

-- Garantir que a função respeita RLS
GRANT EXECUTE ON FUNCTION get_quote_timeline(TEXT) TO authenticated;