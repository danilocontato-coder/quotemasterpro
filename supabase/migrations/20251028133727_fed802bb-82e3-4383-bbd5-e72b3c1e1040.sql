-- Modificar RPC find_or_create_supplier_by_cnpj para aceitar campos extras
CREATE OR REPLACE FUNCTION public.find_or_create_supplier_by_cnpj(
  p_cnpj text,
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_whatsapp text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_address jsonb DEFAULT NULL,
  p_specialties text[] DEFAULT NULL
)
RETURNS TABLE(supplier_id uuid, is_new boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  existing_supplier_id uuid;
  normalized_doc text;
  doc_type text;
BEGIN
  -- Normalizar CNPJ/CPF
  normalized_doc := regexp_replace(p_cnpj, '[^0-9]', '', 'g');
  
  -- Determinar tipo de documento
  doc_type := CASE 
    WHEN length(normalized_doc) = 14 THEN 'cnpj'
    WHEN length(normalized_doc) = 11 THEN 'cpf'
    ELSE 'other'
  END;
  
  -- Buscar fornecedor existente
  SELECT id INTO existing_supplier_id
  FROM public.suppliers
  WHERE document_number = normalized_doc
  LIMIT 1;
  
  -- Se já existe, retornar
  IF existing_supplier_id IS NOT NULL THEN
    RETURN QUERY SELECT existing_supplier_id, false;
    RETURN;
  END IF;
  
  -- Criar novo fornecedor
  INSERT INTO public.suppliers (
    document_number,
    document_type,
    cnpj,
    name,
    email,
    phone,
    whatsapp,
    website,
    city,
    state,
    address,
    specialties,
    certification_status,
    status,
    is_certified,
    type
  ) VALUES (
    normalized_doc,
    doc_type,
    p_cnpj,
    p_name,
    p_email,
    p_phone,
    p_whatsapp,
    p_website,
    p_city,
    p_state,
    p_address,
    p_specialties,
    'pending',
    'active',
    false,
    'local'
  )
  RETURNING id INTO existing_supplier_id;
  
  RETURN QUERY SELECT existing_supplier_id, true;
END;
$function$;