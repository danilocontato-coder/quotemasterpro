-- =====================================================
-- CORREÇÃO COMPLETA DO SISTEMA DE APROVAÇÕES
-- =====================================================

-- 1. Verificar e corrigir foreign key de approvals.approver_id
-- Deve apontar para profiles.id (que é o auth.users.id) não para users.id

-- Remover constraint antiga se existir apontando para users
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'approvals_approver_id_fkey' 
    AND table_name = 'approvals'
  ) THEN
    ALTER TABLE public.approvals DROP CONSTRAINT approvals_approver_id_fkey;
  END IF;
END $$;

-- Adicionar constraint correta apontando para profiles
ALTER TABLE public.approvals 
  ADD CONSTRAINT approvals_approver_id_fkey 
  FOREIGN KEY (approver_id) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- 2. Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_approvals_approver_id ON public.approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_approvals_quote_id_status ON public.approvals(quote_id, status);

-- 3. Criar/atualizar função RPC check_approval_required
-- Esta função retorna se uma cotação requer aprovação e qual nível
CREATE OR REPLACE FUNCTION public.check_approval_required(
  p_quote_id TEXT,
  p_amount NUMERIC,
  p_client_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level RECORD;
  v_result JSONB;
BEGIN
  -- Buscar nível de aprovação aplicável
  SELECT * INTO v_level
  FROM public.approval_levels
  WHERE client_id = p_client_id
    AND active = true
    AND p_amount >= amount_threshold
    AND (max_amount_threshold IS NULL OR p_amount <= max_amount_threshold)
  ORDER BY order_level ASC
  LIMIT 1;
  
  -- Se não encontrou nível, não requer aprovação
  IF v_level.id IS NULL THEN
    RETURN jsonb_build_object(
      'required', false,
      'level', NULL
    );
  END IF;
  
  -- Validar se todos os aprovadores existem em profiles
  -- Filtrar apenas IDs válidos
  DECLARE
    valid_approvers UUID[];
  BEGIN
    SELECT ARRAY_AGG(p.id)
    INTO valid_approvers
    FROM unnest(v_level.approvers) AS approver_id
    JOIN public.profiles p ON p.id = approver_id::uuid
    WHERE p.active = true;
    
    -- Se não há aprovadores válidos, não requer aprovação (com warning no log)
    IF valid_approvers IS NULL OR array_length(valid_approvers, 1) = 0 THEN
      RAISE WARNING 'Nível de aprovação % não tem aprovadores válidos', v_level.name;
      RETURN jsonb_build_object(
        'required', false,
        'level', NULL,
        'warning', 'no_valid_approvers'
      );
    END IF;
    
    -- Atualizar lista de aprovadores com apenas os válidos
    v_level.approvers := valid_approvers;
  END;
  
  -- Retornar nível com aprovadores validados
  v_result := jsonb_build_object(
    'required', true,
    'level', jsonb_build_object(
      'id', v_level.id,
      'name', v_level.name,
      'approvers', v_level.approvers,
      'amount_threshold', v_level.amount_threshold,
      'max_amount_threshold', v_level.max_amount_threshold,
      'order_level', v_level.order_level
    )
  );
  
  RETURN v_result;
END;
$$;

-- 4. Função auxiliar para validar aprovadores de um nível
CREATE OR REPLACE FUNCTION public.validate_approval_level_approvers(p_level_id UUID)
RETURNS TABLE(
  approver_id UUID,
  approver_name TEXT,
  approver_email TEXT,
  is_valid BOOLEAN,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(al.approvers)::uuid AS approver_id,
    COALESCE(p.name, 'Aprovador não encontrado') AS approver_name,
    COALESCE(p.email, 'N/A') AS approver_email,
    (p.id IS NOT NULL) AS is_valid,
    COALESCE(p.active, false) AS is_active
  FROM public.approval_levels al
  LEFT JOIN public.profiles p ON p.id = unnest(al.approvers)::uuid
  WHERE al.id = p_level_id;
END;
$$;

-- 5. Criar view para aprovações com informações enriquecidas
CREATE OR REPLACE VIEW public.approvals_with_details AS
SELECT 
  a.id,
  a.quote_id,
  a.approver_id,
  a.status,
  a.comments,
  a.approved_at,
  a.created_at,
  a.updated_at,
  p.name AS approver_name,
  p.email AS approver_email,
  p.active AS approver_active,
  q.title AS quote_title,
  q.total AS quote_total,
  q.client_id AS quote_client_id,
  q.status AS quote_status
FROM public.approvals a
LEFT JOIN public.profiles p ON p.id = a.approver_id
LEFT JOIN public.quotes q ON q.id = a.quote_id;

-- Grant permissions
GRANT SELECT ON public.approvals_with_details TO authenticated;

-- 6. Adicionar comentários
COMMENT ON FUNCTION public.check_approval_required IS 'Verifica se uma cotação requer aprovação e retorna o nível aplicável com aprovadores validados';
COMMENT ON FUNCTION public.validate_approval_level_approvers IS 'Valida e retorna detalhes dos aprovadores de um nível de aprovação';
COMMENT ON VIEW public.approvals_with_details IS 'View com informações completas de aprovações incluindo dados de aprovador e cotação';