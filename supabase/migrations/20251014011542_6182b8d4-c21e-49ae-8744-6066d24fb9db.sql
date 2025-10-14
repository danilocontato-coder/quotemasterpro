-- ============================================================================
-- FASE 1: Trigger de Sincronização Automática em quote_responses
-- ============================================================================

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trg_sync_supplier_on_response ON public.quote_responses;

-- Função para sincronizar selected_supplier_ids quando uma resposta é criada
CREATE OR REPLACE FUNCTION public.sync_supplier_on_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar selected_supplier_ids e suppliers_sent_count da cotação
  UPDATE public.quotes
  SET 
    selected_supplier_ids = CASE
      WHEN selected_supplier_ids IS NULL THEN ARRAY[NEW.supplier_id]
      WHEN NOT (NEW.supplier_id = ANY(selected_supplier_ids)) THEN array_append(selected_supplier_ids, NEW.supplier_id)
      ELSE selected_supplier_ids
    END,
    suppliers_sent_count = CASE
      WHEN selected_supplier_ids IS NULL THEN 1
      WHEN NOT (NEW.supplier_id = ANY(selected_supplier_ids)) THEN COALESCE(suppliers_sent_count, 0) + 1
      ELSE suppliers_sent_count
    END,
    updated_at = now()
  WHERE id = NEW.quote_id;

  RETURN NEW;
END;
$$;

-- Criar trigger
CREATE TRIGGER trg_sync_supplier_on_response
AFTER INSERT ON public.quote_responses
FOR EACH ROW
EXECUTE FUNCTION public.sync_supplier_on_response();

-- ============================================================================
-- FASE 2: Correção Retroativa de Dados Existentes
-- ============================================================================

-- Passo 1: Atualizar selected_supplier_ids baseado em quote_responses existentes
UPDATE public.quotes q
SET 
  selected_supplier_ids = COALESCE(
    (
      SELECT array_agg(DISTINCT qr.supplier_id)
      FROM public.quote_responses qr
      WHERE qr.quote_id = q.id
    ),
    q.selected_supplier_ids
  ),
  suppliers_sent_count = COALESCE(
    (
      SELECT COUNT(DISTINCT qr.supplier_id)
      FROM public.quote_responses qr
      WHERE qr.quote_id = q.id
    ),
    q.suppliers_sent_count
  ),
  updated_at = now()
WHERE id IN (
  SELECT DISTINCT quote_id 
  FROM public.quote_responses qr
  WHERE NOT EXISTS (
    SELECT 1 
    FROM unnest(COALESCE(q.selected_supplier_ids, '{}')) AS sid
    WHERE sid = qr.supplier_id
  )
);

-- Passo 2: Popular client_suppliers baseado em selected_supplier_ids atualizado
-- Apenas processar supplier_ids que existem na tabela suppliers
INSERT INTO public.client_suppliers (client_id, supplier_id, status, notes)
SELECT DISTINCT
  q.client_id,
  sid AS supplier_id,
  'active',
  'Sincronizado retroativamente via correção de dados'
FROM public.quotes q
CROSS JOIN LATERAL unnest(q.selected_supplier_ids) AS sid
INNER JOIN public.suppliers s ON s.id = sid  -- Garantir que supplier existe
WHERE q.selected_supplier_ids IS NOT NULL 
  AND array_length(q.selected_supplier_ids, 1) > 0
  AND sid IS NOT NULL
ON CONFLICT (client_id, supplier_id) DO UPDATE
SET 
  status = 'active',
  updated_at = now();

-- Log da correção
DO $$
DECLARE
  affected_quotes INTEGER;
  affected_associations INTEGER;
  orphaned_suppliers INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_quotes
  FROM public.quotes
  WHERE selected_supplier_ids IS NOT NULL 
    AND array_length(selected_supplier_ids, 1) > 0;
    
  SELECT COUNT(*) INTO affected_associations
  FROM public.client_suppliers
  WHERE notes LIKE '%Sincronizado retroativamente%';
  
  -- Contar fornecedores órfãos (em selected_supplier_ids mas não em suppliers)
  SELECT COUNT(DISTINCT sid) INTO orphaned_suppliers
  FROM public.quotes q
  CROSS JOIN LATERAL unnest(q.selected_supplier_ids) AS sid
  WHERE sid IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = sid);
  
  RAISE NOTICE '✅ Correção concluída: % cotações processadas, % associações criadas/atualizadas, % fornecedores órfãos ignorados', 
    affected_quotes, affected_associations, orphaned_suppliers;
END $$;