-- 1. Remover duplicatas de ai_negotiations (manter apenas a mais recente)
DELETE FROM public.ai_negotiations
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY quote_id 
        ORDER BY created_at DESC
      ) as rn
    FROM public.ai_negotiations
  ) t
  WHERE rn > 1
);

-- 2. Adicionar constraint UNIQUE em ai_negotiations.quote_id
ALTER TABLE public.ai_negotiations
ADD CONSTRAINT ai_negotiations_quote_id_unique 
UNIQUE (quote_id);

-- 3. Remover duplicatas de quote_responses (manter apenas a mais recente)
DELETE FROM public.quote_responses
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY quote_id, supplier_id 
        ORDER BY created_at DESC
      ) as rn
    FROM public.quote_responses
  ) t
  WHERE rn > 1
);

-- 4. Adicionar constraint UNIQUE em quote_responses
ALTER TABLE public.quote_responses
ADD CONSTRAINT quote_responses_quote_supplier_unique 
UNIQUE (quote_id, supplier_id);

-- 5. Log de auditoria
INSERT INTO public.audit_logs (
  user_id,
  action,
  entity_type,
  entity_id,
  panel_type,
  details
) VALUES (
  NULL,
  'SCHEMA_UPDATE',
  'ai_negotiations_and_quote_responses',
  'cleanup_and_constraints',
  'system',
  jsonb_build_object(
    'actions', ARRAY['removed_ai_negotiations_duplicates', 'added_ai_negotiations_unique', 'removed_quote_responses_duplicates', 'added_quote_responses_unique'],
    'reason', 'Fixed database integrity and prevent future duplicates',
    'timestamp', now()
  )
);