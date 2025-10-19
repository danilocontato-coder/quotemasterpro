-- Drop e recriar função search_supplier_by_cnpj para incluir state e city
DROP FUNCTION IF EXISTS public.search_supplier_by_cnpj(text);

CREATE FUNCTION public.search_supplier_by_cnpj(search_cnpj text)
RETURNS TABLE(
    id uuid,
    name text,
    cnpj text,
    email text,
    phone text,
    whatsapp text,
    website text,
    address jsonb,
    state text,
    city text,
    specialties text[],
    certification_status text,
    status text,
    is_associated boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    current_client_id uuid;
    normalized_doc text := regexp_replace(search_cnpj, '[^0-9]', '', 'g');
BEGIN
    current_client_id := get_current_user_client_id();
    
    IF current_client_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.cnpj,
        s.email,
        s.phone,
        s.whatsapp,
        s.website,
        s.address,
        s.state,
        s.city,
        s.specialties,
        s.certification_status,
        s.status,
        EXISTS(
            SELECT 1 FROM public.client_suppliers cs 
            WHERE cs.supplier_id = s.id 
            AND cs.client_id = current_client_id 
            AND cs.status = 'active'
        ) as is_associated
    FROM public.suppliers s
    WHERE 
      (regexp_replace(COALESCE(s.document_number, ''), '[^0-9]', '', 'g') = normalized_doc)
      OR
      (regexp_replace(COALESCE(s.cnpj, ''), '[^0-9]', '', 'g') = normalized_doc);
END;
$$;