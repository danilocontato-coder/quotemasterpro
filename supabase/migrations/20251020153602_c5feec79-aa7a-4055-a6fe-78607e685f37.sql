-- Drop existing function first to allow signature change
DROP FUNCTION IF EXISTS public.search_supplier_by_cnpj(text);

-- Recreate search_supplier_by_cnpj with improved logic
CREATE OR REPLACE FUNCTION public.search_supplier_by_cnpj(search_cnpj text)
RETURNS TABLE (
  id uuid,
  name text,
  cnpj text,
  email text,
  phone text,
  status text,
  document_number text,
  document_type text,
  certification_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_client_id uuid;
    user_role text;
    normalized_doc text;
BEGIN
    current_client_id := get_current_user_client_id();
    user_role := get_user_role();
    normalized_doc := regexp_replace(search_cnpj, '[^0-9]', '', 'g');
    
    -- Platform admins can search all suppliers
    IF user_role = 'admin' THEN
        RETURN QUERY
        SELECT 
            s.id, s.name, s.cnpj, s.email, s.phone, s.status,
            s.document_number, s.document_type, s.certification_status
        FROM suppliers s
        WHERE regexp_replace(COALESCE(s.document_number, ''), '[^0-9]', '', 'g') = normalized_doc
           OR regexp_replace(COALESCE(s.cnpj, ''), '[^0-9]', '', 'g') = normalized_doc;
        RETURN;
    END IF;
    
    IF current_client_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        s.id, s.name, s.cnpj, s.email, s.phone, s.status,
        s.document_number, s.document_type, s.certification_status
    FROM suppliers s
    WHERE (
        regexp_replace(COALESCE(s.document_number, ''), '[^0-9]', '', 'g') = normalized_doc
        OR regexp_replace(COALESCE(s.cnpj, ''), '[^0-9]', '', 'g') = normalized_doc
    )
    AND (
        s.client_id = current_client_id
        OR s.certification_status = 'certified'
        OR EXISTS (
            SELECT 1 FROM client_suppliers cs
            WHERE cs.supplier_id = s.id
              AND cs.client_id = current_client_id
              AND cs.status = 'active'
        )
    );
END;
$$;

-- Sync cnpj and document_number fields for consistency
UPDATE suppliers
SET document_number = cnpj
WHERE document_number IS NULL AND cnpj IS NOT NULL;

UPDATE suppliers
SET cnpj = document_number
WHERE cnpj IS NULL 
  AND document_number IS NOT NULL
  AND regexp_replace(document_number, '[^0-9]', '', 'g') ~ '^[0-9]{14}$';

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_suppliers_document_number_normalized 
ON suppliers (regexp_replace(COALESCE(document_number, ''), '[^0-9]', '', 'g'));

CREATE INDEX IF NOT EXISTS idx_suppliers_cnpj_normalized 
ON suppliers (regexp_replace(COALESCE(cnpj, ''), '[^0-9]', '', 'g'));