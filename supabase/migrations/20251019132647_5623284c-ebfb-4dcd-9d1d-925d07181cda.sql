-- ============================================
-- FASE 1: CORREÇÃO DE DEDUPLICAÇÃO DE CNPJ
-- Adicionar logs de auditoria nas RPCs
-- ============================================

-- 1.1) Modificar find_or_create_supplier_by_cnpj para adicionar logs
CREATE OR REPLACE FUNCTION public.find_or_create_supplier_by_cnpj(
  p_cnpj text,
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
  normalized_cnpj text := regexp_replace(p_cnpj, '[^0-9]', '', 'g');
  existing_supplier RECORD;
  new_supplier_id uuid;
  current_user_id uuid := auth.uid();
BEGIN
  -- Buscar fornecedor existente (ignora RLS via SECURITY DEFINER)
  SELECT s.* INTO existing_supplier
  FROM public.suppliers s
  WHERE regexp_replace(s.cnpj, '[^0-9]', '', 'g') = normalized_cnpj
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
        'search_cnpj', p_cnpj,
        'normalized_cnpj', normalized_cnpj,
        'existing_supplier_name', existing_supplier.name,
        'existing_supplier_id', existing_supplier.id,
        'existing_supplier_type', existing_supplier.type,
        'existing_supplier_status', existing_supplier.status,
        'existing_client_id', existing_supplier.client_id,
        'searched_by_user_id', current_user_id
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
      cnpj, name, email, phone, 
      certification_status, status, is_certified, type
    ) VALUES (
      p_cnpj, p_name, p_email, p_phone,
      'pending', 'active', false, 'local'
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
        'supplier_cnpj', p_cnpj,
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

-- 1.2) Modificar associate_supplier_to_client para adicionar logs
CREATE OR REPLACE FUNCTION public.associate_supplier_to_client(
  p_supplier_id uuid,
  p_client_id uuid DEFAULT NULL
)
RETURNS uuid SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  target_client_id uuid := COALESCE(p_client_id, get_current_user_client_id());
  association_id uuid;
  supplier_name text;
  client_name_val text;
  current_user_id uuid := auth.uid();
  was_inactive boolean := false;
  existing_status text;
BEGIN
  -- Validação: cliente deve existir
  IF target_client_id IS NULL THEN
    RAISE EXCEPTION 'target_client_id cannot be null';
  END IF;
  
  -- Buscar nome do fornecedor e do cliente
  SELECT name INTO supplier_name FROM public.suppliers WHERE id = p_supplier_id;
  SELECT name INTO client_name_val FROM public.clients WHERE id = target_client_id;
  
  -- Verificar se já existe associação
  SELECT id, status INTO association_id, existing_status
  FROM public.client_suppliers
  WHERE supplier_id = p_supplier_id AND client_id = target_client_id;
  
  IF FOUND THEN
    -- Verificar se estava inativa
    was_inactive := (existing_status = 'inactive');
    
    -- Reativar se estava inativa
    UPDATE public.client_suppliers 
    SET status = 'active', updated_at = now()
    WHERE id = association_id;
    
    -- Log: Associação reativada
    IF was_inactive THEN
      INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, panel_type, details)
      VALUES (
        current_user_id,
        'SUPPLIER_ASSOCIATION_REACTIVATED',
        'client_suppliers',
        association_id::text,
        'client',
        jsonb_build_object(
          'supplier_id', p_supplier_id,
          'supplier_name', supplier_name,
          'client_id', target_client_id,
          'client_name', client_name_val,
          'previous_status', 'inactive',
          'reactivated_by_user_id', current_user_id
        )
      );
    END IF;
  ELSE
    -- Criar nova associação
    INSERT INTO public.client_suppliers (client_id, supplier_id, status)
    VALUES (target_client_id, p_supplier_id, 'active')
    RETURNING id INTO association_id;
    
    -- Log: Nova associação criada
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, panel_type, details)
    VALUES (
      current_user_id,
      'SUPPLIER_ASSOCIATED',
      'client_suppliers',
      association_id::text,
      'client',
      jsonb_build_object(
        'supplier_id', p_supplier_id,
        'supplier_name', supplier_name,
        'client_id', target_client_id,
        'client_name', client_name_val,
        'association_type', 'new',
        'created_by_user_id', current_user_id
      )
    );
  END IF;
  
  RETURN association_id;
END;
$$;

-- ============================================
-- COMENTÁRIOS FINAIS
-- ============================================
-- Esta migration adiciona logs de auditoria detalhados para:
-- 1. Busca de fornecedor duplicado (SUPPLIER_DUPLICATE_FOUND)
-- 2. Criação de novo fornecedor via RPC (SUPPLIER_CREATED_GLOBAL)
-- 3. Nova associação de fornecedor a cliente (SUPPLIER_ASSOCIATED)
-- 4. Reativação de associação inativa (SUPPLIER_ASSOCIATION_REACTIVATED)
--
-- Todas as operações agora geram logs rastreáveis em audit_logs!