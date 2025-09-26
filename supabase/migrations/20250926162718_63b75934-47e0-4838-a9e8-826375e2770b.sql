-- Dropar função existente e recriar com novo tipo de retorno
DROP FUNCTION IF EXISTS public.search_supplier_by_cnpj(text);

-- Função RPC para validar status do fornecedor antes da associação
CREATE OR REPLACE FUNCTION public.validate_supplier_status_for_association(p_supplier_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  supplier_record RECORD;
BEGIN
  -- Buscar informações do fornecedor
  SELECT id, name, status, cnpj, email 
  INTO supplier_record
  FROM public.suppliers 
  WHERE id = p_supplier_id;
  
  -- Se fornecedor não existe
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error_code', 'SUPPLIER_NOT_FOUND',
      'message', 'Fornecedor não encontrado no sistema'
    );
  END IF;
  
  -- Se fornecedor está inativo
  IF supplier_record.status != 'active' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error_code', 'SUPPLIER_INACTIVE',
      'message', 'Este fornecedor está inativo no sistema e não pode ser associado',
      'supplier_name', supplier_record.name,
      'supplier_status', supplier_record.status,
      'supplier_cnpj', supplier_record.cnpj,
      'supplier_email', supplier_record.email
    );
  END IF;
  
  -- Fornecedor válido para associação
  RETURN jsonb_build_object(
    'valid', true,
    'supplier_name', supplier_record.name,
    'supplier_status', supplier_record.status
  );
END;
$$;

-- Recriar função de busca por CNPJ incluindo status
CREATE OR REPLACE FUNCTION public.search_supplier_by_cnpj(search_cnpj text)
RETURNS TABLE(
    id uuid,
    name text,
    cnpj text,
    email text,
    phone text,
    whatsapp text,
    website text,
    address jsonb,
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
BEGIN
    -- Obter o client_id do usuário atual
    current_client_id := get_current_user_client_id();
    
    -- Se não há cliente, retornar vazio
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
    WHERE public.normalize_cnpj(s.cnpj) = public.normalize_cnpj(search_cnpj);
END;
$$;