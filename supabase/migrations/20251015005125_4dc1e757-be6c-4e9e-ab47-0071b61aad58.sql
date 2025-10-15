-- ========================================
-- CORREÇÃO COMPLETA: STATUS DE COTAÇÕES E FORNECEDORES
-- ========================================

-- ========================================
-- PARTE 1: NORMALIZAR FORNECEDORES DUPLICADOS
-- ========================================

-- Criar tabela temporária para mapear fornecedores duplicados
-- Usa o registro mais ANTIGO (MIN(created_at)) como principal
CREATE TEMP TABLE supplier_duplicates AS
WITH duplicates_with_rank AS (
  SELECT 
    id,
    normalize_cnpj(cnpj) as cnpj_normalizado,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY normalize_cnpj(cnpj) 
      ORDER BY created_at ASC
    ) as rank
  FROM suppliers
  WHERE cnpj IS NOT NULL 
    AND cnpj != ''
    AND status != 'inactive'
)
SELECT 
  cnpj_normalizado,
  (SELECT id FROM duplicates_with_rank d2 
   WHERE d2.cnpj_normalizado = d1.cnpj_normalizado 
   AND d2.rank = 1 
   LIMIT 1) as id_principal,
  array_agg(id) as todos_ids
FROM duplicates_with_rank d1
GROUP BY cnpj_normalizado
HAVING COUNT(*) > 1;

-- Atualizar referências em quote_responses
UPDATE quote_responses qr
SET supplier_id = sd.id_principal
FROM supplier_duplicates sd
WHERE qr.supplier_id = ANY(sd.todos_ids)
  AND qr.supplier_id != sd.id_principal;

-- Atualizar referências em quote_suppliers
UPDATE quote_suppliers qs
SET supplier_id = sd.id_principal
FROM supplier_duplicates sd
WHERE qs.supplier_id = ANY(sd.todos_ids)
  AND qs.supplier_id != sd.id_principal;

-- Atualizar referências em client_suppliers
UPDATE client_suppliers cs
SET supplier_id = sd.id_principal,
    updated_at = now()
FROM supplier_duplicates sd
WHERE cs.supplier_id = ANY(sd.todos_ids)
  AND cs.supplier_id != sd.id_principal;

-- Atualizar referências em payments
UPDATE payments p
SET supplier_id = sd.id_principal,
    updated_at = now()
FROM supplier_duplicates sd
WHERE p.supplier_id = ANY(sd.todos_ids)
  AND p.supplier_id != sd.id_principal;

-- Atualizar referências em deliveries
UPDATE deliveries d
SET supplier_id = sd.id_principal,
    updated_at = now()
FROM supplier_duplicates sd
WHERE d.supplier_id = ANY(sd.todos_ids)
  AND d.supplier_id != sd.id_principal;

-- Atualizar referências em supplier_ratings
UPDATE supplier_ratings sr
SET supplier_id = sd.id_principal,
    updated_at = now()
FROM supplier_duplicates sd
WHERE sr.supplier_id = ANY(sd.todos_ids)
  AND sr.supplier_id != sd.id_principal;

-- Atualizar referências em quote_visits
UPDATE quote_visits qv
SET supplier_id = sd.id_principal,
    updated_at = now()
FROM supplier_duplicates sd
WHERE qv.supplier_id = ANY(sd.todos_ids)
  AND qv.supplier_id != sd.id_principal;

-- Atualizar referências em support_tickets
UPDATE support_tickets st
SET supplier_id = sd.id_principal,
    updated_at = now()
FROM supplier_duplicates sd
WHERE st.supplier_id = ANY(sd.todos_ids)
  AND st.supplier_id != sd.id_principal;

-- Desativar fornecedores duplicados (mantendo apenas o principal)
UPDATE suppliers s
SET 
  status = 'inactive',
  updated_at = now()
FROM supplier_duplicates sd
WHERE s.id = ANY(sd.todos_ids)
  AND s.id != sd.id_principal;

-- ========================================
-- PARTE 2: CORRIGIR TRIGGER DE STATUS
-- ========================================

CREATE OR REPLACE FUNCTION public.update_quote_responses_count_and_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invited_suppliers_count INTEGER;
  current_responses_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Contar fornecedores REALMENTE convidados (fonte de verdade)
    SELECT COUNT(*) INTO invited_suppliers_count
    FROM quote_suppliers
    WHERE quote_id = NEW.quote_id;
    
    -- Contar respostas recebidas
    SELECT COUNT(*) INTO current_responses_count
    FROM quote_responses
    WHERE quote_id = NEW.quote_id;
    
    UPDATE public.quotes
    SET 
      responses_count = current_responses_count,
      status = CASE 
        WHEN status = 'sent' THEN
          CASE 
            -- Se não tem fornecedores convidados, mantém 'sent'
            WHEN invited_suppliers_count = 0 THEN 'sent'
            -- Se recebeu respostas de TODOS os convidados (igualdade estrita)
            WHEN current_responses_count = invited_suppliers_count THEN 'received'
            -- Se recebeu pelo menos uma resposta mas não todas
            WHEN current_responses_count > 0 THEN 'receiving'
            ELSE 'sent'
          END
        ELSE status 
      END,
      -- SINCRONIZAR suppliers_sent_count com a contagem real
      suppliers_sent_count = invited_suppliers_count,
      updated_at = now()
    WHERE id = NEW.quote_id;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Contar fornecedores convidados
    SELECT COUNT(*) INTO invited_suppliers_count
    FROM quote_suppliers
    WHERE quote_id = OLD.quote_id;
    
    -- Contar respostas após delete
    SELECT COUNT(*) INTO current_responses_count
    FROM quote_responses
    WHERE quote_id = OLD.quote_id;
    
    UPDATE public.quotes
    SET 
      responses_count = current_responses_count,
      status = CASE 
        -- Se não tem mais respostas, volta para 'sent'
        WHEN current_responses_count = 0 THEN 'sent'
        -- Se tem todas as respostas esperadas (igualdade estrita)
        WHEN invited_suppliers_count > 0 
         AND current_responses_count = invited_suppliers_count THEN 'received'
        -- Pelo menos uma resposta mas não todas
        WHEN current_responses_count > 0 THEN 'receiving'
        ELSE 'sent'
      END,
      suppliers_sent_count = invited_suppliers_count,
      updated_at = now()
    WHERE id = OLD.quote_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- ========================================
-- PARTE 3: SINCRONIZAR DADOS EXISTENTES
-- ========================================

-- Sincronizar suppliers_sent_count com contagem real de quote_suppliers
UPDATE public.quotes q
SET 
  suppliers_sent_count = COALESCE(
    (SELECT COUNT(*) FROM quote_suppliers qs WHERE qs.quote_id = q.id),
    0
  ),
  updated_at = now()
WHERE q.status IN ('sent', 'receiving', 'received');

-- Recalcular responses_count
UPDATE public.quotes q
SET 
  responses_count = COALESCE(
    (SELECT COUNT(*) FROM quote_responses qr WHERE qr.quote_id = q.id),
    0
  ),
  updated_at = now()
WHERE q.status IN ('sent', 'receiving', 'received');

-- Recalcular status baseado na contagem REAL de convidados
UPDATE public.quotes q
SET 
  status = CASE 
    -- Sem respostas = 'sent'
    WHEN q.responses_count = 0 THEN 'sent'
    -- Sem fornecedores convidados mas tem respostas = 'receiving'
    WHEN COALESCE(
      (SELECT COUNT(*) FROM quote_suppliers WHERE quote_id = q.id),
      0
    ) = 0 AND q.responses_count > 0 THEN 'receiving'
    -- Todas as respostas recebidas = 'received' (igualdade estrita)
    WHEN q.responses_count = COALESCE(
      (SELECT COUNT(*) FROM quote_suppliers WHERE quote_id = q.id),
      0
    ) AND q.responses_count > 0 THEN 'received'
    -- Pelo menos uma resposta mas não todas = 'receiving'
    WHEN q.responses_count > 0 
     AND q.responses_count < COALESCE(
       (SELECT COUNT(*) FROM quote_suppliers WHERE quote_id = q.id),
       1
     ) THEN 'receiving'
    ELSE q.status
  END,
  updated_at = now()
WHERE q.status IN ('sent', 'receiving', 'received');

-- ========================================
-- PARTE 4: AUDITORIA E LOGS
-- ========================================

-- Log da normalização de duplicatas (apenas se houver duplicatas)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM supplier_duplicates) THEN
    INSERT INTO public.audit_logs (
      action, 
      entity_type, 
      entity_id, 
      panel_type, 
      details
    ) 
    SELECT
      'SYSTEM_SUPPLIER_DEDUPLICATION',
      'suppliers',
      'bulk_merge',
      'system',
      jsonb_build_object(
        'duplicates_found', COUNT(*),
        'merged_to_principal', json_agg(
          json_build_object(
            'cnpj', cnpj_normalizado,
            'principal_id', id_principal,
            'merged_count', array_length(todos_ids, 1) - 1
          )
        ),
        'execution_date', now()
      )
    FROM supplier_duplicates;
  END IF;
END $$;

-- Log da correção de status
INSERT INTO public.audit_logs (
  action, 
  entity_type, 
  entity_id, 
  panel_type, 
  details
) VALUES (
  'SYSTEM_QUOTE_STATUS_MASS_FIX',
  'quotes',
  'bulk_correction',
  'system',
  jsonb_build_object(
    'corrections', json_build_object(
      'trigger_updated', true,
      'logic_change', 'Mudou de >= para = (igualdade estrita) e usa quote_suppliers como fonte de verdade',
      'suppliers_sent_count_synced', true,
      'status_recalculated', true,
      'duplicate_suppliers_merged', (SELECT COUNT(*) > 0 FROM supplier_duplicates)
    ),
    'affected_quotes', (
      SELECT COUNT(*) 
      FROM quotes 
      WHERE status IN ('sent', 'receiving', 'received')
    ),
    'execution_date', now()
  )
);

-- Limpar tabela temporária
DROP TABLE IF EXISTS supplier_duplicates;