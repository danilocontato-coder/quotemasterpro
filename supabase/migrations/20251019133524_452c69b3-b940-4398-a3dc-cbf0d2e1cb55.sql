-- ============================================
-- Migration: Corrigir busca CPF/CNPJ em RPCs
-- ============================================
-- Objetivo: Permitir que find_or_create_supplier_by_cnpj e search_supplier_by_cnpj
-- busquem fornecedores em document_number E cnpj (compatibilidade), diferenciando CPF/CNPJ

-- ============================================
-- 1) Corrigir find_or_create_supplier_by_cnpj
-- ============================================
CREATE OR REPLACE FUNCTION public.find_or_create_supplier_by_cnpj(
  p_cnpj text,  -- Na verdade pode ser CPF ou CNPJ
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS TABLE (
  supplier_id uuid,
  is_new boolean,
  certification_status text,
  existing_name text
) SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_doc text := regexp_replace(p_cnpj, '[^0-9]', '', 'g');
  existing_supplier RECORD;
  new_supplier_id uuid;
  current_user_id uuid := auth.uid();
  doc_type text;
BEGIN
  -- Determinar tipo de documento (CPF = 11, CNPJ = 14)
  IF length(normalized_doc) = 11 THEN
    doc_type := 'cpf';
  ELSIF length(normalized_doc) = 14 THEN
    doc_type := 'cnpj';
  ELSE
    RAISE EXCEPTION 'Documento inválido: deve ter 11 (CPF) ou 14 (CNPJ) dígitos';
  END IF;
  
  -- Buscar fornecedor existente (prioriza document_number, fallback para cnpj)
  SELECT s.* INTO existing_supplier
  FROM public.suppliers s
  WHERE 
    -- Busca principal: document_number
    (regexp_replace(COALESCE(s.document_number, ''), '[^0-9]', '', 'g') = normalized_doc)
    OR 
    -- Fallback: cnpj (compatibilidade com registros antigos)
    (regexp_replace(COALESCE(s.cnpj, ''), '[^0-9]', '', 'g') = normalized_doc)
  LIMIT 1;
  
  IF FOUND THEN
    -- Log: Fornecedor duplicado encontrado
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, panel_type, details)
    VALUES (
      current_user_id,
      'SUPPLIER_DUPLICATE_FOUND',
      'suppliers',
      existing_supplier.id::text,
      'client',
      jsonb_build_object(
        'search_document', p_cnpj,
        'normalized_document', normalized_doc,
        'document_type', doc_type,
        'existing_supplier_name', existing_supplier.name,
        'existing_supplier_id', existing_supplier.id,
        'existing_supplier_type', existing_supplier.type,
        'existing_supplier_status', existing_supplier.status,
        'existing_client_id', existing_supplier.client_id,
        'searched_by_user_id', current_user_id,
        'found_in_field', CASE 
          WHEN regexp_replace(COALESCE(existing_supplier.document_number, ''), '[^0-9]', '', 'g') = normalized_doc 
          THEN 'document_number' 
          ELSE 'cnpj' 
        END
      )
    );
    
    -- Fornecedor existe, retornar dados existentes
    RETURN QUERY SELECT 
      existing_supplier.id,
      false,
      existing_supplier.certification_status,
      existing_supplier.name;
  ELSE
    -- Fornecedor não existe, criar novo
    INSERT INTO public.suppliers (
      document_number, 
      document_type,
      cnpj,  -- Preencher cnpj também para compatibilidade
      name, 
      email, 
      phone, 
      certification_status, 
      status, 
      is_certified, 
      type
    ) VALUES (
      normalized_doc,
      doc_type,
      p_cnpj,  -- Salvar formatado
      p_name, 
      p_email, 
      p_phone,
      'pending', 
      'active', 
      false, 
      'local'
    ) RETURNING id INTO new_supplier_id;
    
    -- Log: Fornecedor criado
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, panel_type, details)
    VALUES (
      current_user_id,
      'SUPPLIER_CREATED_GLOBAL',
      'suppliers',
      new_supplier_id::text,
      'client',
      jsonb_build_object(
        'supplier_name', p_name,
        'supplier_document', p_cnpj,
        'supplier_document_type', doc_type,
        'supplier_email', p_email,
        'supplier_phone', p_phone,
        'created_via_rpc', true,
        'created_by_user_id', current_user_id
      )
    );
    
    RETURN QUERY SELECT 
      new_supplier_id,
      true,
      'pending'::text,
      p_name;
  END IF;
END;
$$;

-- ============================================
-- 2) Atualizar search_supplier_by_cnpj para consistência
-- ============================================
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
      -- Buscar em document_number OU cnpj (compatibilidade)
      (regexp_replace(COALESCE(s.document_number, ''), '[^0-9]', '', 'g') = normalized_doc)
      OR
      (regexp_replace(COALESCE(s.cnpj, ''), '[^0-9]', '', 'g') = normalized_doc);
END;
$$;