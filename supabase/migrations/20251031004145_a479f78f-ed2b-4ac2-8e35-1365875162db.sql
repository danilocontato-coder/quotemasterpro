-- Corrigir função get_quote_timeline para usar local_code
DROP FUNCTION IF EXISTS get_quote_timeline(uuid);

CREATE OR REPLACE FUNCTION get_quote_timeline(p_quote_id uuid)
RETURNS TABLE (
  event_id uuid,
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
  WITH timeline_events AS (
    -- Evento: Criação da cotação
    SELECT 
      gen_random_uuid() as event_id,
      'quote_created' as event_type,
      q.created_at as event_date,
      'Cotação Criada' as event_title,
      'A cotação foi criada no sistema' as event_description,
      jsonb_build_object(
        'quote_code', q.local_code,
        'total', q.total,
        'client_name', c.name
      ) as event_metadata,
      p.full_name as user_name,
      p.role as user_role
    FROM quotes q
    LEFT JOIN clients_condos c ON q.client_id = c.id
    LEFT JOIN profiles p ON q.created_by = p.id
    WHERE q.id = p_quote_id

    UNION ALL

    -- Evento: Mudanças de status
    SELECT 
      gen_random_uuid() as event_id,
      'status_changed' as event_type,
      al.created_at as event_date,
      'Status Alterado' as event_title,
      CASE 
        WHEN (al.details->>'new_status') = 'draft' THEN 'Cotação em rascunho'
        WHEN (al.details->>'new_status') = 'sent' THEN 'Cotação enviada aos fornecedores'
        WHEN (al.details->>'new_status') = 'under_review' THEN 'Cotação em análise'
        WHEN (al.details->>'new_status') = 'approved' THEN 'Cotação aprovada'
        WHEN (al.details->>'new_status') = 'rejected' THEN 'Cotação rejeitada'
        WHEN (al.details->>'new_status') = 'paid' THEN 'Pagamento confirmado'
        WHEN (al.details->>'new_status') = 'cancelled' THEN 'Cotação cancelada'
        ELSE 'Status alterado'
      END as event_description,
      jsonb_build_object(
        'old_status', al.details->>'old_status',
        'new_status', al.details->>'new_status'
      ) as event_metadata,
      p.full_name as user_name,
      p.role as user_role
    FROM audit_logs al
    LEFT JOIN profiles p ON al.user_id = p.id
    WHERE al.entity_id = p_quote_id::text
      AND al.entity_type = 'quotes'
      AND al.action = 'UPDATE'
      AND al.details ? 'new_status'

    UNION ALL

    -- Evento: Aprovações
    SELECT 
      a.id as event_id,
      'approval' as event_type,
      COALESCE(a.approved_at, a.created_at) as event_date,
      CASE 
        WHEN a.status = 'approved' THEN 'Aprovação Concedida'
        WHEN a.status = 'rejected' THEN 'Aprovação Negada'
        ELSE 'Aguardando Aprovação'
      END as event_title,
      COALESCE(a.comments, 'Sem comentários') as event_description,
      jsonb_build_object(
        'status', a.status,
        'comments', a.comments
      ) as event_metadata,
      p.full_name as user_name,
      p.role as user_role
    FROM approvals a
    LEFT JOIN profiles p ON a.approver_id = p.id
    WHERE a.quote_id = p_quote_id::text

    UNION ALL

    -- Evento: Propostas recebidas
    SELECT 
      qr.id as event_id,
      'proposal_received' as event_type,
      qr.created_at as event_date,
      'Proposta Recebida' as event_title,
      'Fornecedor ' || COALESCE(s.name, 'desconhecido') || ' enviou uma proposta' as event_description,
      jsonb_build_object(
        'supplier_name', s.name,
        'total_value', qr.total_value,
        'status', qr.status
      ) as event_metadata,
      p.full_name as user_name,
      'supplier' as user_role
    FROM quote_responses qr
    LEFT JOIN suppliers s ON qr.supplier_id = s.id
    LEFT JOIN profiles p ON s.id = p.supplier_id
    WHERE qr.quote_id = p_quote_id::text

    UNION ALL

    -- Evento: Pagamentos
    SELECT 
      pay.id as event_id,
      'payment' as event_type,
      pay.created_at as event_date,
      CASE 
        WHEN pay.status = 'pending' THEN 'Pagamento Pendente'
        WHEN pay.status = 'paid' THEN 'Pagamento Confirmado'
        WHEN pay.status = 'failed' THEN 'Pagamento Falhou'
        ELSE 'Registro de Pagamento'
      END as event_title,
      'Valor: R$ ' || pay.amount::text as event_description,
      jsonb_build_object(
        'amount', pay.amount,
        'status', pay.status,
        'payment_method', pay.payment_method
      ) as event_metadata,
      p.full_name as user_name,
      p.role as user_role
    FROM payments pay
    LEFT JOIN profiles p ON pay.created_by = p.id
    WHERE pay.quote_id = p_quote_id::text
  )
  SELECT * FROM timeline_events
  ORDER BY event_date ASC;
END;
$$;