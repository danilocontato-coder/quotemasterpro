-- Primeiro, dropar a função existente
DROP FUNCTION IF EXISTS get_quote_timeline(text);

-- Recriar a função corrigida usando p.name ao invés de p.full_name
CREATE OR REPLACE FUNCTION get_quote_timeline(p_quote_id text)
RETURNS TABLE (
  event_id text,
  event_type text,
  event_date timestamptz,
  event_title text,
  event_description text,
  event_metadata jsonb,
  user_name text,
  user_role text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- 1) Criação da cotação
  SELECT
    'quote_created_' || q.id::text as event_id,
    'quote_created'::text as event_type,
    q.created_at as event_date,
    'Cotação criada'::text as event_title,
    'A cotação foi criada no sistema'::text as event_description,
    jsonb_build_object(
      'quote_code', q.code,
      'total', q.total
    ) as event_metadata,
    p.name as user_name,
    p.role as user_role
  FROM quotes q
  LEFT JOIN profiles p ON p.id = q.created_by
  WHERE q.id = p_quote_id

  UNION ALL

  -- 2) Mudanças de status
  SELECT
    'status_' || al.id::text as event_id,
    'status_change'::text as event_type,
    al.created_at as event_date,
    'Status alterado'::text as event_title,
    'Status mudou de ' || COALESCE((al.details->>'old_status')::text, 'desconhecido') || 
    ' para ' || COALESCE((al.details->>'new_status')::text, 'desconhecido') as event_description,
    jsonb_build_object(
      'old_status', al.details->>'old_status',
      'new_status', al.details->>'new_status'
    ) as event_metadata,
    p.name as user_name,
    p.role as user_role
  FROM audit_logs al
  LEFT JOIN profiles p ON p.id = al.user_id
  WHERE al.entity_type = 'quote'
    AND al.entity_id = p_quote_id
    AND al.action = 'UPDATE'
    AND al.details ? 'old_status'
    AND al.details ? 'new_status'
    AND (al.details->>'old_status') IS DISTINCT FROM (al.details->>'new_status')

  UNION ALL

  -- 3) Respostas de fornecedores
  SELECT
    'response_' || qr.id::text as event_id,
    'supplier_response'::text as event_type,
    qr.created_at as event_date,
    'Fornecedor enviou proposta'::text as event_title,
    s.name || ' enviou uma proposta' as event_description,
    jsonb_build_object(
      'supplier_name', s.name,
      'total_amount', qr.total_amount,
      'status', qr.status
    ) as event_metadata,
    s.name as user_name,
    'supplier'::text as user_role
  FROM quote_responses qr
  JOIN suppliers s ON s.id = qr.supplier_id
  WHERE qr.quote_id = p_quote_id

  UNION ALL

  -- 4) Atualizações nas respostas
  SELECT
    'response_update_' || al.id::text as event_id,
    'response_update'::text as event_type,
    al.created_at as event_date,
    'Proposta atualizada'::text as event_title,
    'Status da proposta mudou para ' || COALESCE((al.details->>'new_status')::text, 'desconhecido') as event_description,
    jsonb_build_object(
      'old_status', al.details->>'old_status',
      'new_status', al.details->>'new_status',
      'response_id', al.entity_id
    ) as event_metadata,
    COALESCE(s.name, 'Sistema') as user_name,
    COALESCE(p.role, 'system') as user_role
  FROM audit_logs al
  LEFT JOIN quote_responses qr ON qr.id::text = al.entity_id
  LEFT JOIN suppliers s ON s.id = qr.supplier_id
  LEFT JOIN profiles p ON p.id = al.user_id
  WHERE al.entity_type = 'quote_response'
    AND qr.quote_id = p_quote_id
    AND al.action = 'UPDATE'
    AND al.details ? 'new_status'

  UNION ALL

  -- 5) Entregas
  SELECT
    'delivery_' || d.id::text as event_id,
    CASE 
      WHEN d.status = 'delivered' THEN 'delivery_completed'
      ELSE 'delivery_scheduled'
    END as event_type,
    COALESCE(d.delivered_at, d.scheduled_date) as event_date,
    CASE 
      WHEN d.status = 'delivered' THEN 'Entrega realizada'
      ELSE 'Entrega agendada'
    END as event_title,
    CASE 
      WHEN d.status = 'delivered' THEN 'Entrega foi concluída com sucesso'
      ELSE 'Entrega foi agendada'
    END as event_description,
    jsonb_build_object(
      'delivery_code', d.code,
      'status', d.status,
      'scheduled_date', d.scheduled_date,
      'delivered_at', d.delivered_at
    ) as event_metadata,
    p.name as user_name,
    p.role as user_role
  FROM deliveries d
  LEFT JOIN profiles p ON p.id = d.delivered_by
  WHERE d.quote_id = p_quote_id

  UNION ALL

  -- 6) Aprovações
  SELECT
    'approval_' || a.id::text as event_id,
    CASE 
      WHEN a.status = 'approved' THEN 'approval_approved'
      WHEN a.status = 'rejected' THEN 'approval_rejected'
      ELSE 'approval_pending'
    END as event_type,
    COALESCE(a.approved_at, a.created_at) as event_date,
    CASE 
      WHEN a.status = 'approved' THEN 'Aprovação concedida'
      WHEN a.status = 'rejected' THEN 'Aprovação rejeitada'
      ELSE 'Aprovação pendente'
    END as event_title,
    CASE 
      WHEN a.status = 'approved' THEN COALESCE(p.name, 'Usuário') || ' aprovou a cotação'
      WHEN a.status = 'rejected' THEN COALESCE(p.name, 'Usuário') || ' rejeitou a cotação'
      ELSE 'Aguardando aprovação'
    END as event_description,
    jsonb_build_object(
      'status', a.status,
      'comments', a.comments,
      'approver_name', p.name
    ) as event_metadata,
    p.name as user_name,
    p.role as user_role
  FROM approvals a
  LEFT JOIN profiles p ON p.id = a.approver_id
  WHERE a.quote_id = p_quote_id

  ORDER BY event_date DESC;
END;
$$;