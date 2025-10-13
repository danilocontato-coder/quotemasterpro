-- Migração corretiva: Converter quotes.id de "RFQxx" para UUIDs
-- Incluindo TODAS as tabelas que referenciam quotes

-- Passo 1: Criar tabela temporária para mapear IDs antigos → novos UUIDs
CREATE TEMP TABLE quote_id_mapping (
  old_id TEXT PRIMARY KEY,
  new_id TEXT NOT NULL UNIQUE
);

-- Passo 2: Gerar novos UUIDs para todas as cotações existentes
INSERT INTO quote_id_mapping (old_id, new_id)
SELECT id, gen_random_uuid()::text
FROM public.quotes;

-- Passo 3: Dropar TODAS as foreign key constraints para quotes
ALTER TABLE public.quote_items DROP CONSTRAINT IF EXISTS quote_items_quote_id_fkey;
ALTER TABLE public.quote_responses DROP CONSTRAINT IF EXISTS quote_responses_quote_id_fkey;
ALTER TABLE public.quote_suppliers DROP CONSTRAINT IF EXISTS quote_suppliers_quote_id_fkey;
ALTER TABLE public.approvals DROP CONSTRAINT IF EXISTS approvals_quote_id_fkey;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_quote_id_fkey;
ALTER TABLE public.quote_visits DROP CONSTRAINT IF EXISTS quote_visits_quote_id_fkey;
ALTER TABLE public.quote_tokens DROP CONSTRAINT IF EXISTS quote_tokens_quote_id_fkey;
ALTER TABLE public.ai_negotiations DROP CONSTRAINT IF EXISTS ai_negotiations_quote_id_fkey;
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_quote_id_fkey;

-- Passo 4: Atualizar quotes.id
UPDATE public.quotes q
SET id = m.new_id
FROM quote_id_mapping m
WHERE q.id = m.old_id;

-- Passo 5: Atualizar TODAS as referências

UPDATE public.quote_items qi
SET quote_id = m.new_id
FROM quote_id_mapping m
WHERE qi.quote_id = m.old_id;

UPDATE public.quote_responses qr
SET quote_id = m.new_id
FROM quote_id_mapping m
WHERE qr.quote_id = m.old_id;

UPDATE public.quote_suppliers qs
SET quote_id = m.new_id
FROM quote_id_mapping m
WHERE qs.quote_id = m.old_id;

UPDATE public.approvals a
SET quote_id = m.new_id
FROM quote_id_mapping m
WHERE a.quote_id = m.old_id;

UPDATE public.payments p
SET quote_id = m.new_id
FROM quote_id_mapping m
WHERE p.quote_id = m.old_id;

UPDATE public.quote_visits qv
SET quote_id = m.new_id
FROM quote_id_mapping m
WHERE qv.quote_id = m.old_id;

UPDATE public.quote_tokens qt
SET quote_id = m.new_id
FROM quote_id_mapping m
WHERE qt.quote_id = m.old_id;

UPDATE public.ai_negotiations ain
SET quote_id = m.new_id
FROM quote_id_mapping m
WHERE ain.quote_id = m.old_id;

UPDATE public.audit_logs al
SET entity_id = m.new_id
FROM quote_id_mapping m
WHERE al.entity_type = 'quotes' 
  AND al.entity_id = m.old_id;

UPDATE public.deliveries d
SET quote_id = m.new_id
FROM quote_id_mapping m
WHERE d.quote_id = m.old_id;

-- Passo 6: Recriar TODAS as foreign key constraints
ALTER TABLE public.quote_items 
  ADD CONSTRAINT quote_items_quote_id_fkey 
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;

ALTER TABLE public.quote_responses 
  ADD CONSTRAINT quote_responses_quote_id_fkey 
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;

ALTER TABLE public.quote_suppliers 
  ADD CONSTRAINT quote_suppliers_quote_id_fkey 
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;

ALTER TABLE public.approvals 
  ADD CONSTRAINT approvals_quote_id_fkey 
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;

ALTER TABLE public.payments 
  ADD CONSTRAINT payments_quote_id_fkey 
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;

ALTER TABLE public.quote_visits 
  ADD CONSTRAINT quote_visits_quote_id_fkey 
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;

ALTER TABLE public.quote_tokens 
  ADD CONSTRAINT quote_tokens_quote_id_fkey 
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;

ALTER TABLE public.ai_negotiations 
  ADD CONSTRAINT ai_negotiations_quote_id_fkey 
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;

ALTER TABLE public.deliveries 
  ADD CONSTRAINT deliveries_quote_id_fkey 
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;

-- Passo 7: Verificação de integridade
DO $$
DECLARE
  uuid_count INTEGER;
  total_count INTEGER;
  orphan_count INTEGER;
BEGIN
  -- Verificar UUIDs válidos
  SELECT COUNT(*) INTO uuid_count
  FROM public.quotes
  WHERE id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  
  SELECT COUNT(*) INTO total_count FROM public.quotes;
  
  IF uuid_count != total_count THEN
    RAISE EXCEPTION 'Migração falhou: % de % cotações não têm IDs UUID válidos', (total_count - uuid_count), total_count;
  END IF;
  
  -- Verificar referências órfãs em quote_items
  SELECT COUNT(*) INTO orphan_count
  FROM public.quote_items qi
  WHERE NOT EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = qi.quote_id);
  
  IF orphan_count > 0 THEN
    RAISE WARNING '⚠ % itens órfãos encontrados em quote_items', orphan_count;
  END IF;
  
  RAISE NOTICE '✅ Migração concluída: % cotações convertidas para UUID', total_count;
END $$;