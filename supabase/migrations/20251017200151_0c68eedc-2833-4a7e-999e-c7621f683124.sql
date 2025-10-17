-- 1. Limpar entregas duplicadas (manter apenas a mais recente)
DELETE FROM deliveries
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY quote_id, supplier_id ORDER BY created_at DESC) as rn
    FROM deliveries
  ) t
  WHERE rn > 1
);

-- 2. Adicionar constraint UNIQUE para prevenir duplicatas
ALTER TABLE deliveries 
ADD CONSTRAINT deliveries_quote_supplier_unique 
UNIQUE (quote_id, supplier_id);

-- 3. Popular supplier_name em quotes existentes
UPDATE quotes q
SET supplier_name = s.name,
    updated_at = now()
FROM suppliers s
WHERE q.supplier_id = s.id
AND q.supplier_name IS NULL;

-- 4. Criar trigger para manter supplier_name sincronizado
CREATE OR REPLACE FUNCTION sync_quote_supplier_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.supplier_id IS NOT NULL AND (NEW.supplier_name IS NULL OR OLD.supplier_id IS DISTINCT FROM NEW.supplier_id) THEN
    SELECT name INTO NEW.supplier_name
    FROM suppliers
    WHERE id = NEW.supplier_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_quote_supplier_name ON quotes;
CREATE TRIGGER trg_sync_quote_supplier_name
BEFORE INSERT OR UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION sync_quote_supplier_name();